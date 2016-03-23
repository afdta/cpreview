//to do -- need to set height on svg container

(function(){

if(!CP2016.session.svg){return null;} //no-op if svg not supported

var newmap = true;

CP2016.dom.tractmap.back.on("mousedown",function(d,i){
  CP2016.dom.show("map1");
  hidetip();
  newmap = true;
  CP2016.state.metro = null; //ensure that when the tractmap is redrawn (when this view is returned to), no transitions are used
});

var indicator = "pov1014"
var indicatorPeriod = {pov1014:"2010-14", pov0509:"2005-09", pov00:"2000"}

var setTitle = function(){
  var text = "Neighborhood poverty rates in the " + 
             CP2016.metroLookup[CP2016.state.metro][0].CBSA_Title +
             " metro area, " + 
             indicatorPeriod[indicator];

  CP2016.dom.tractmap.title.text(text);
}

var currentTracts;
var curretnGeoJSON;
var tractOutlines;
var panning;

var path = d3.geo.path().projection(null);
var tractDB = {};

var getDrawTracts = function(cbsa){
  var uri = CP2016.session.repo + "geojson/" + cbsa + ".json";
  var processDat = function(dat){

    //resetFilters();
    var geojson = topojson.feature(dat,dat.objects.tracts);
    var mesh = topojson.mesh(dat,dat.objects.tracts);

    var meshCity = topojson.mesh(dat,dat.objects.tracts,function(a,b){

      if((a.properties.city || b.properties.city) && a.properties.city !== b.properties.city){
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

    //orchestrate the drawing of new metros
    if(newmap){zoomWayOut();} //reset zoom level, scale, and translate
    drawSVG(geojson, CP2016.state.metro === cbsa, [meshCity]);
    CP2016.state.metro = cbsa;
    setTitle();
    CP2016.dom.tractmap.svg.style("visibility","visible");
    newmap = false; //only reset when the user switches from this view
  } 

  if(cbsa in tractDB){
    processDat(tractDB[cbsa]);
  }
  else{
    d3.json(uri, function(error, dat){
      if (error){
        //to do: handle error condition
        return null;
      }
      else{
        tractDB[cbsa] = dat;
        processDat(dat);
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
    var x = 950 - coord[0] > (tipwidth+10) ? coord[0] + 10 : coord[0] - tipwidth - 10;
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
  //reset zoom/translate

  var sel = CP2016.dom.tractmap.tracts.selectAll("path.tract").data(gj.features);
  sel.exit().remove();
  sel.enter().append("path").classed("tract",true).attr({"fill":"#ffffff","stroke":"#ffffff"});
  sel.attr("d",path).attr({"stroke-width":(1/CP2016.dom.tractmap.zoom.scale)})
      .style("pointer-events","all")
      .style("visibility","visible");
      //.style("cursor","pointer");
  sel.attr("data-tract",function(d,i){
  	return d.id;
  });
  sel.on("mouseover",showtip);
  sel.on("mousemove",showtip);
  sel.on("touchstart",showtip);
  CP2016.dom.tractmap.tracts.on("mouseleave",hidetip);

  CP2016.dom.tractmap.hovertract
    .attr({"fill":"none","stroke":"#666666","stroke-width":(3/CP2016.dom.tractmap.zoom.scale)+"px"})
    .style("pointer-events","none");


  currentTracts = sel;
  currentGeoJSON = gj;  

  CP2016.dom.tractmap.outlines.selectAll("path.tractMesh").remove();//blank slate insures proper draw order
  var m = CP2016.dom.tractmap.outlines.selectAll("path.tractMesh").data(meshes);
  m.exit().remove();
  m.enter().append("path").classed("tractMesh",true);
  //var borderColors = ["#555555","#ffcf1a"]; //metro & county, city(ies) "#e8a717"
  m.attr({"fill":"none"}).attr("stroke-width",(2/CP2016.dom.tractmap.zoom.scale)).attr("d",path)
   .attr("stroke",function(d,i){
    return "#333333";
    //return borderColors[i];
  }); //.attr("stroke-dasharray","2, 1")
  
  //select first (county) path and show or hide
  //MPAR.svg.tractOutlines.select("path").style("visibility",MPAR.input.countiesShown ? "visible" : "hidden");
  //m.attr("stroke-dasharray",function(d,i){return i===0 ? "8,3" : "none"})

  shadeTracts(sel, gj, transition);
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

function shadeTracts(selection,geojson,transition){

  var fmt = function(v){return v}
  var MAP = function(d){return d.properties[indicator]}
  var SUM = 0;
  var NUM = 0;

  var dat = geojson.features.map(function(d,i,a){
    var val = MAP(d);
    if(d.properties.city===1){
      SUM = SUM + val;
      NUM++;
    }
    return val;
  })

  var AVG = SUM/NUM;


  //labcol will get called with -1, -0.8, -0.6, -0.4, -0.2, 0.2, 0.4, 0.6, 0.8, or 1 -- never 0 (which maps to #ffffff)
  //values above plarge will be assigned the top category and values below psmall will be assigned the bottom category by qs
  var strokeFN = function(d,i){
    try{
      var v = MAP(d);
      var c = v2c(v,true);
      /*var s = v < 0 ? -1 : 1;
      var t = (typeof v === "undefined" || v === null || isNaN(v) || !isFinite(v) ) ? null : qs(Math.abs(v))/ncols;
      var c = labcol(t*s);*/
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
      /*var s = v < 0 ? -1 : 1;
      var t = (typeof v === "undefined" || v === null || isNaN(v) || !isFinite(v) ) ? null : qs(Math.abs(v))/ncols;
      var c = labcol(t*s);*/
    }
    catch(e){
      var c = "#ffffff";
    }
    return c;
  }

  if(transition){
     selection
      .transition().duration(1400)
      .attr("stroke", strokeFN)
      .attr("fill", fillFN); 
  }
  else{
     selection
      .attr("stroke", strokeFN)
      .attr("fill", fillFN);
  }


  //MPAR.title.metro.text(MPAR.input.metro);
  //MPAR.title.indicator.text(MPAR.input.indicator.t);
  //if(dataTable.loadSummaryTable){dataTable.loadSummaryTable()};

  var ncols = cols.length;
  var step = 1/ncols;
  var hstep = step/2; //pick a value in center of range to avoid rounding issues
  //quantize determines quantile: [min, min+step],(min+step, min+2*step], ... , (min+(n-1)*step, min+n*step] -- note that rounding errors may cause some fuzziness at boundaries using this calc
  //console.log(scales.quantile30(min + 14*step - 0.0000000001));

  var sliceHeight = 20;
 
 /* var sliceDat = [];

  for(var i=0;i<ncols;i++){
    var upper = ((ncols-i)/ncols);
    var lower = ((ncols-i-1)/ncols);
    var upperV = upper*max;
    var lowerV = lower*max;
    var mid = (upperV+lowerV)/2;
    var quantile = qs(mid);
    
    sliceDat.push({l:fmt(lowerV), h:fmt(upperV), q:quantile, c:labcol(quantile/ncols), y:i*sliceHeight});

    if(actualMin < 0){
      var y_ = ncols*sliceHeight;
      sliceDat.push({h:fmt(0-lowerV), l:fmt(0-upperV), q:quantile, c:labcol(0-(quantile/ncols)), y:y_+((ncols-i-1)*sliceHeight)});
    }
  }

  sliceDat.sort(function(a,b){return a.y-b.y});*/

  var legend = CP2016.dom.tractmap.legend;
  var rectG = legend.selectAll("g.legendSlice").data([]);
  rectG.enter().append("g").classed("legendSlice",true);
  rectG.exit().remove();
  rectG.attr("transform",function(d,i){return "translate(20," + (d.y+22) + ")"})

  var lines = rectG.selectAll("path").data(function(d,i){
    if(i===lcols-1){return [{"x1":0,"x2":33,"y1":sliceHeight-1,"y2":sliceHeight-1},{"x1":0,"x2":33,"y1":0,"y2":0}]}
    else{return [{"x1":0,"x2":33,"y1":0,"y2":0}]}
  });
  lines.enter().append("path");
  lines.exit().remove();
  lines.attr("d",function(d,i){return "M0,"+d.y1+" l"+d.x2+",0"}).attr({"fill":"none","stroke":"#d1d1d1"}).style("shape-rendering","crispEdges");

  var rect = rectG.selectAll("rect").data(function(d,i){return [d]});
  rect.enter().append("rect");
  rect.exit().remove();
  rect.attr({"x":0,"y":0,"width":30,"height":sliceHeight}).attr("fill",function(d,i){return d.c});

  var text = rectG.selectAll("text").data(function(d,i){
    if(i===lcols-1){return [{l:d.h,y:3},{l:d.l,y:sliceHeight+3}]}
    else{return [{l:d.h,y:3}]}
  });
  text.enter().append("text");
  text.exit().remove();
  text.attr({"x":38,"y":0}).style({"font-size":"11px"}).text(function(d,i){return d.l}).attr("dy",function(d,i){return d.y});// : (d.q===1 ? d.l : "")}).attr("dy",function(d,i){return d.q===1 ? sliceHeight+4 : 4});

  //primaryCityMarker.attr("transform","translate(20,"+ (sliceDat.length*sliceHeight+50) +")");

};


  var pbuttons = CP2016.dom.tractmap.periods.selectAll("div").data([{l:"2000", c:"pov00"}, {l:"2010-14", c:"pov1014"}]);
  pbuttons.enter().append("div").append("p").classed("disable-select",true);
  pbuttons.exit().remove();
  pbuttons.select("p").text(function(d,i){return d.l});

  var sync_pbuttons = function(){
    pbuttons.classed("button-selected",function(d,i){return d.c===indicator});
  }
  sync_pbuttons();

  pbuttons.on("mousedown",function(d,i){
    indicator = d.c;
    getDrawTracts(CP2016.state.metro);
    sync_pbuttons();
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
      currentTracts.attr("stroke-width",(1*(1/newZoom))+"px");
    }

    CP2016.dom.tractmap.outlines.selectAll("path").attr("stroke-width",function(d,i){return ((i+2)/CP2016.dom.tractmap.zoom.scale)+"px"});

    CP2016.dom.tractmap.hovertract.attr("stroke-width", (3/newZoom)+"px")

    //MPAR.svg.hoverPath.attr("stroke-width",(1/CP2016.dom.tractmap.zoom.scale)+"px");
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