//to do -- need to set height on svg container

(function(){

if(!CP2016.session.svg){return null;} //no-op if svg not supported

var previndicator = null; //keep track of incompatible switches
var indicator = "pov1014"
var indicatorPeriod = {pov1014:"2010-14", pov0509:"2005-09", pov00:"2000"}

//user messaging
var usermessage = {wrap:CP2016.dom.tractmap.messages, timer:null, duration:4500, loading:false, geo:false}
usermessage.p = usermessage.wrap.append("p").text("Loading neighborhood data...");


//return back to map 1
CP2016.dom.tractmap.back.on("mousedown",function(d,i){
  CP2016.dom.show("map1");
  hidetip();
  CP2016.state.metro = null; //ensure that when the tractmap is redrawn (when this view is returned to), no transitions are used
});

//when drawing a new map (i.e. coming from view 1) match the time periods, if possible
var setIndicator = function(){
  if(CP2016.state.period === "2010_14"){
    indicator = "pov1014"; 
  }
  else if(CP2016.state.period === "2005_09"){
    indicator = "pov0509";
  }
  else if(CP2016.state.period === "2000"){
    indicator = "pov00";
  }
  else{
    indicator = "pov1014";
  }
}

var setTitle = function(){
  var text = "Neighborhood poverty rates in the " + 
             CP2016.metroLookup[CP2016.state.metro][0].CBSA_Title +
             " metro area, " + 
             indicatorPeriod[indicator];

  CP2016.dom.tractmap.title.text(text);
}

var currentTracts;
var currentMeshes;

var panning;

var path = d3.geo.path().projection(null);
var tractDB = {t2000:{}, t2010:{}};

var getDrawTracts = function(cbsa){
  
  //orchestrate the drawing of new metros
  if(CP2016.state.metro===null){
    zoomWayOut(); //reset zoom level, scale, and translate
    setIndicator(); //match tract time period with metro level map time period
  } 

  sync_pbuttons();

  if(indicator === "pov0509"){
    var DB = tractDB.t2000;
  }
  else{
    var DB = tractDB.t2010;
  }

  var uri = CP2016.session.repo + "geojson/" + (indicator==="pov0509" ? "2000/" : "2010/") + cbsa + ".json";

  var processDat = function(dat){

    //resetFilters();
    var geojson = topojson.feature(dat,dat.objects.tracts);
    var mesh = topojson.mesh(dat,dat.objects.tracts);

    var meshCity = topojson.mesh(dat,dat.objects.tracts,function(a,b){

      if((a.properties.city || b.properties.city) && (a.properties.plfips !== b.properties.plfips)){
        var keep = true; 
      }
      else if(a.properties.city ===1 && a===b){
        var keep = true;
      }
      else{
        var keep = false;
      }
      return keep;
    });
    var meshCounty = topojson.mesh(dat,dat.objects.tracts,function(a,b){
      return a.id.substring(0,5) !== b.id.substring(0,5) || (a===b);
    });


    drawSVG(geojson, CP2016.state.metro === cbsa, [meshCounty, meshCity]);
    
    CP2016.state.metro = cbsa; //for "new" maps, the metro property will be null during the execution of drawSVG
    setTitle();
    CP2016.dom.tractmap.svg.style("visibility","visible");

  } 

  if(cbsa in DB){
    processDat(DB[cbsa]);
  }
  else{
    //display loading message
    usermessage.wrap.style("display","block");
    usermessage.p.html("Loading neighborhood data...")
    usermessage.loading = true
    
    //load data
    d3.json(uri, function(error, dat){
      if (error){
        //to do: handle error condition
        return null;
      }
      else{
        DB[cbsa] = dat;
        processDat(dat);
      }

      //hide loading messages
      usermessage.loading = false;
      if(!usermessage.geo){
        usermessage.wrap.style("display","none");
      }

    });
  }
}

var tiptimer;
function showtip(td,i){
  clearTimeout(tiptimer);

  var d = d3.select(this).attr("d");
  CP2016.dom.tractmap.hovertract.attr("d",d);

  var wrapper = CP2016.dom.tractmap.wrap.node();

  //from job proximity
  var touchEvent = d3.event.type.search(/touch/i) > -1;
  var mousemove = d3.event.type.search(/mousemove/i) > -1;

  if(touchEvent){
    d3.event.preventDefault();
    //d3.event.stopPropagation();
    try{
      var coord = d3.touches(wrapper)[0];
    }
    catch(e){
      var coord = null
    }
  }
  else{
    var coord = d3.mouse(wrapper);
  }

  var tipbox = CP2016.dom.tractmap.tip.node().getBoundingClientRect();
  var tipwidth = Math.round(tipbox.right - tipbox.left);
  var tipheight = Math.round(tipbox.bottom - tipbox.top);

  try{  
    var x = 950 - coord[0] > (tipwidth+20) ? coord[0] + 20 : coord[0] - tipwidth - 20;
    var y = 700 - coord[1] > (tipheight-25) ? coord[1] - 25 : 700 - tipheight;
  }
  catch(e){
    var x = coord[0];
    var y = coord[1];
  }
  //end from job proximity

  var text = CP2016.dom.tractmap.tip.selectAll("p.tract-rate")
                .data(["Poverty rate, " + indicatorPeriod[indicator], CP2016.pround(td.properties[indicator])]);

  text.enter().append("p").classed("tract-rate",true);
  text.exit().remove();
  text.text(function(d,i){return d});
  CP2016.dom.tractmap.tip.style({"display":"block", "left":x+"px", "top":y+"px", "pointer-events":"none"});
}

function hidetip(){
  tiptimer = setTimeout(function(){
    CP2016.dom.tractmap.tip.style("display","none");
  },250);
  CP2016.dom.tractmap.hovertract.attr("d","M0,0");
}

//combine draw functions into one that renders to svg and/or canvas
function drawSVG(gj, transition, meshes){

  if(!!CP2016.state.metro && (indicator==="pov0509" || previndicator==="pov0509")){
    transition = false; //don't run transitions in this case
    
    //display geo inconsistency message
    usermessage.p.html('Some neighborhood boundaries have changed with your selection.')
    usermessage.geo = true;
    usermessage.wrap.style("display","block");

    clearTimeout(usermessage.timer);
    usermessage.timer = setTimeout(function(){
      usermessage.geo = false;
      if(!usermessage.loading){
        usermessage.wrap.style("display","none");
      }
      usermessage.duration = 1500; //subsequent messages will appear for shorter duration
    }, usermessage.duration);

  }

  if(indicator === "pov0509"){
    var tracts = CP2016.dom.tractmap.tracts00.style("display","inline");
    CP2016.dom.tractmap.tracts.style("display","none");
  }
  else{
    var tracts = CP2016.dom.tractmap.tracts.style("display","inline");
    CP2016.dom.tractmap.tracts00.style("display","none");
  }

  var sel = tracts.selectAll("path.tract").data(gj.features);
  sel.exit().remove();
  sel.enter().append("path").classed("tract",true).attr({"fill":"#ffffff","stroke":"#ffffff"});
  sel.attr("d",path).attr({"stroke-width":(1/CP2016.dom.tractmap.zoom.scale)})
      .style("pointer-events","all");
      //.style("cursor","pointer");
  sel.attr("data-tract",function(d,i){
  	return d.id;
  });

  sel.on("mouseover",showtip);
  sel.on("mousemove",showtip);
  sel.on("touchstart",showtip);
  tracts.on("mouseleave",hidetip);

  CP2016.dom.tractmap.hovertract
    .attr({"fill":"rgba(255,255,255,1)","stroke":"#ffcf1a","stroke-width":(3/CP2016.dom.tractmap.zoom.scale)+"px"})
    .style("pointer-events","none");
 

  CP2016.dom.tractmap.outlines.selectAll("path.tractMesh").remove();//blank slate insures proper draw order
  var m = CP2016.dom.tractmap.outlines.selectAll("path.tractMesh").data(meshes);
  m.exit().remove();
  m.enter().append("path").classed("tractMesh",true);
  m.attr({"fill":"none"}).attr("stroke-width",function(d,i){
    return ((i+1)/CP2016.dom.tractmap.zoom.scale) + "px";
  })
  .attr("d",path)
  .attr("stroke","#333333");
  
  currentTracts = sel;
  currentMeshes = m;


  shadeTracts(sel, transition);
};


var range = function(n){
  var range = [];
  for(var i=1;i<=n;i++){
    range.push(i);
  }
  return range;
}

var cols = ['#fee5d9','#fcae91','#fb6a4a','#de2d26','#a50f15']; 
function v2c(v, borderCol){
  if(v < 0.1){var index = 0}
  else if(v<0.2){var index = 1}
  else if(v<0.3){var index = 2}
  else if(v<0.4){var index = 3}
  else{ var index = 4}
  var c = cols[index];
  var lab = d3.lab(c);
  if(!borderCol){
    return c;
  }
  else{
    return lab.darker(0.5).toString();
  }
}

//fill in legend
var swatches = CP2016.dom.tractmap.legend.selectAll("div.swatch")
                     .data([[0,"<10%"], 
                           [0.1, "10% to 20%"], 
                           [0.2, "20% to 30%"], 
                           [0.3, "30% to 40%"], 
                           [0.4, "40%+"]]);
var swatch_enter = swatches.enter().append("div").classed("c-fix",true);
  swatch_enter.append("div").style({"float":"left", "width":"25px", "height":"25px", "border":"1px solid #ffffff"});
  swatch_enter.append("p").style({"float":"left", "margin-left":"10px"});
swatches.exit().remove();

swatches.select("div").style("background-color",function(d,i){
  return v2c(d[0]);
})
swatches.select("p").text(function(d,i){return d[1]}).style("line-height","25px");

var nodata = CP2016.dom.tractmap.legend.append("div").classed("c-fix",true).style("margin-top","10px");
nodata.append("div").style({"float":"left", "width":"23px", "height":"23px","border":"1px solid #333333", "margin-left":"1px"});
nodata.append("p").style({"float":"left", "margin-left":"10px", "line-height":"23px"}).text("No data");

CP2016.dom.tractmap.legend.append("div").style({"border-top":"2px solid #333333","margin":"15px 0px 0px 0px","padding-top":"5px"})
  .append("p").text("Primary city/cities");

//end legend creation

function shadeTracts(selection, transition){

  var MAP = function(d){return d.properties[indicator]}

  var strokeFN = function(d,i){
    try{
      var v = MAP(d);
      var c = v2c(v,true);
    }
    catch(e){
      console.log(e);
      var c = "#ffffff";
    }
    return c;
  }

  var fillFN = function(d,i){
    try{
      var v = MAP(d);
      var c = v2c(v);
    }
    catch(e){
      var c = "#ffffff";
    }
    return c;
  }

  if(transition){
     selection
      .transition().duration(700)
      .attr("stroke", strokeFN)
      .attr("fill", fillFN); 
  }
  else{
     selection
      .attr("stroke", strokeFN)
      .attr("fill", fillFN);
  }
};


  var pbuttons = CP2016.dom.tractmap.periods.selectAll("div").data([{l:"2000", c:"pov00"}, 
                                                                    {l:"2005-09", c:"pov0509"},
                                                                    {l:"2010-14", c:"pov1014"}]);
  pbuttons.enter().append("div").append("p").classed("disable-select",true);
  pbuttons.exit().remove();
  pbuttons.select("p").text(function(d,i){return d.l});

  function sync_pbuttons(){
    pbuttons.classed("button-selected",function(d,i){return d.c===indicator});
  }

  pbuttons.on("mousedown",function(d,i){
    previndicator = indicator;
    indicator = d.c;
    sync_pbuttons();
    getDrawTracts(CP2016.state.metro);
  });

  /*PAN*/
  //PAN FUNCITON
  var panto = function(){
    hidetip();
    var x = d3.event.x;
    var y = d3.event.y;
    var s = CP2016.dom.tractmap.zoom.scale;
    CP2016.dom.tractmap.zoom.translate.x = x;
    CP2016.dom.tractmap.zoom.translate.y = y;
    CP2016.dom.tractmap.tractwrap.attr("transform","translate("+x+","+y+") scale("+s+")");
  }

  var pan = d3.behavior.drag()
    .origin(function(){return CP2016.dom.tractmap.zoom.translate})
    .on("drag",panto)
    .on("dragstart",function(){
      panning = true;
    }).on("dragend",function(){
      panning = false;
    })


  CP2016.dom.tractmap.wrap.call(pan);
  /*END PAN*/


  /*ZOOM IN OUT*/
  var zoomInOut = function(inTrueOutFalse){
    d3.event.preventDefault(); //prevent use of zoom button from interacting with zoom behavior on mapWrap
    d3.event.stopPropagation();
    var recenter = null;
     
    var currentZoom = CP2016.dom.tractmap.zoom.scale;
    var cX = CP2016.dom.tractmap.zoom.translate.x;
    var cY = CP2016.dom.tractmap.zoom.translate.y;
    
    var dX = (CP2016.dom.tractmap.CENTER[0]-cX)/currentZoom; //translate in native coordinates
    var dY = (CP2016.dom.tractmap.CENTER[1]-cY)/currentZoom;

    if(inTrueOutFalse){
      var newlevel = CP2016.dom.tractmap.zoom.level+1;
      var zoomValid = newlevel < CP2016.dom.tractmap.zoom.levels.length;
      CP2016.dom.tractmap.zoom.level = zoomValid ? newlevel : CP2016.dom.tractmap.zoom.levels.length-1;

    }
    else{
      var newlevel = CP2016.dom.tractmap.zoom.level-1;
      var zoomValid = newlevel >= 0;
      CP2016.dom.tractmap.zoom.level = zoomValid ? newlevel : 0;
      if((!zoomValid || newlevel===0) && CP2016.dom.tractmap.zoom.translate.x !== 0){
        var recenter = true;
      }
    }

    CP2016.dom.tractmap.zoom.out.classed("noMoreZoom",CP2016.dom.tractmap.zoom.level <= 0);
    CP2016.dom.tractmap.zoom.in.classed("noMoreZoom",CP2016.dom.tractmap.zoom.level >= CP2016.dom.tractmap.zoom.levels.length-1);

    var newZoom = CP2016.dom.tractmap.zoom.levels[CP2016.dom.tractmap.zoom.level];

    if(recenter){
      var targetX = 0;
      var targetY = 0 + CP2016.dom.tractmap.zoom.yOffset;
    }
    else if(!zoomValid){
      return null; //no-op
    }
    else{
      var targetX = CP2016.dom.tractmap.CENTER[0]-(dX*newZoom); //scaled translate
      var targetY = CP2016.dom.tractmap.CENTER[1]-(dY*newZoom);
    }

    CP2016.dom.tractmap.zoom.scale = newZoom;
    CP2016.dom.tractmap.zoom.translate.x = targetX;
    CP2016.dom.tractmap.zoom.translate.y = targetY;
    
    CP2016.dom.tractmap.tractwrap.attr("transform","translate("+targetX+","+targetY+") scale("+newZoom+")");
    
    if(currentTracts){
      currentTracts.attr("stroke-width",(1/newZoom)+"px");
    }

    if(currentMeshes){
      currentMeshes.attr("stroke-width",function(d,i){
        return ((i+1)/CP2016.dom.tractmap.zoom.scale)+"px";
      });
    }

    CP2016.dom.tractmap.hovertract.attr("stroke-width", (3/newZoom)+"px")
  }

  function zoomWayOut(){
    CP2016.dom.tractmap.zoom.scale = 1; //current zoom scale to 1
    CP2016.dom.tractmap.zoom.level = 0; //current zoom level in levels array
    CP2016.dom.tractmap.zoom.translate = {x:0,y:0 + CP2016.dom.tractmap.zoom.yOffset};
    CP2016.dom.tractmap.zoom.out.classed("noMoreZoom",true);
    CP2016.dom.tractmap.zoom.in.classed("noMoreZoom",false);
    CP2016.dom.tractmap.tractwrap.attr("transform","translate("+CP2016.dom.tractmap.zoom.translate.x+","+CP2016.dom.tractmap.zoom.translate.y+") scale(1)");
  }

  CP2016.dom.tractmap.zoom.in.on("mousedown",function(d,i){
    d3.event.stopPropagation();
    d3.event.preventDefault();
    zoomInOut(true);
  });
  CP2016.dom.tractmap.zoom.out.on("mousedown",function(d,i){
    d3.event.preventDefault();
    d3.event.stopPropagation();
    zoomInOut(false);
  });

  CP2016.dom.tractmap.svg.on("dblclick",function(d,i){
    d3.event.stopPropagation();
    zoomInOut(true);
  });
  /*END ZOOM IN OUT*/


  CP2016.drawTracts = getDrawTracts;

})(); //end closure