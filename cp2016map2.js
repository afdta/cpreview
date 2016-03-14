(function(){

if(!CP2016.session.svg){return null;} //no-op if svg not supported

var indicator = "pov1014"

var zoom = CP2016.dom.tractmap.zoom;

var path = d3.geo.path().projection(null);
var tractDB = {};
var current_cbsa = null;
var getDrawTracts = function(cbsa){
  var uri = CP2016.session.repo + "geojson/" + cbsa + ".json";
  var processDat = function(dat){

    //resetFilters();
    var geojson = topojson.feature(dat,dat.objects.tracts);
    var mesh = topojson.mesh(dat,dat.objects.tracts);

    var meshCity = topojson.mesh(dat,dat.objects.tracts,function(a,b){
      //1&2) See if tract is in recode list and determine if it borders another city tract (if so, don't draw border)
      //3) if at least one geometry is a city and their place FIPS don't match, draw border
      //4) if the geometries are the same and a city, they are on the border (i.e. they don't share a border with any other geos)
      //5) special case for tract recodes
      //Note: city recoded tracts that lie on the border between two different cities will result in a gap in the border between cities (there is no PLID available for recodes)
      
      //due to bad data in job prox files
      /*if(a.id in tractRecode){
        if(b.properties.CITY===1 || b.id in tractRecode){var keep=false}
        else{var keep=true}
      }
      else if(b.id in tractRecode){
        if(a.properties.CITY===1){var keep=false}
        else{var keep=true}
      }*/

      if((a.properties.city || b.properties.city) && a.properties.city !== b.properties.city){ //&& (a.properties.PLID !== b.properties.PLID)){
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

    //var meshCounty = topojson.mesh(dat,dat.objects.tracts,function(a,b){return a.id.substring(0,5) !== b.id.substring(0,5) || (a===b)});
    
    drawSVG(geojson, current_cbsa === cbsa, [meshCity]);
    current_cbsa = cbsa;
    //drawCanvas(geoJSON,MPAR.canvas);
    //[meshCounty,meshCity]
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

//combine draw functions into one that renders to svg and/or canvas
function drawSVG(gj, transition, meshes){
  var sel = CP2016.dom.tractmap.tracts.selectAll("path.tract").data(gj.features);
  sel.exit().remove();
  sel.enter().append("path").classed("tract",true).attr({"fill":"#ffffff","stroke":"#ffffff"});
  sel.attr("d",path).attr({"stroke-width":1}).style("pointer-events","all").style("visibility","visible");
  sel.attr("data-tract",function(d,i){
  	return d.id;
  });
  //sel.on("mouseover",showtip);
  //sel.on("mousemove",showtip);
  //sel.on("touchstart",showtip);
  //MPAR.svg.tractGroup.on("mouseleave",hidetip);

  //MPAR.svg.hoverPath.attr({"fill":"#fbfbfb","stroke":"#666666","stroke-width":"1px"}).style("pointer-events","none");
  //var t = MPAR.svg.hoverPath.node();
  //t.parentNode.appendChild(t);

  //var timer;

  //MPAR.svg.currentTracts = sel;
  //MPAR.svg.currentGeoJSON = gj;  

  CP2016.dom.tractmap.outlines.selectAll("path.tractMesh").remove();//blank slate insures proper draw order
  var m = CP2016.dom.tractmap.outlines.selectAll("path.tractMesh").data(meshes);
  m.exit().remove();
  m.enter().append("path").classed("tractMesh",true);
  //var borderColors = ["#555555","#ffcf1a"]; //metro & county, city(ies) "#e8a717"
  m.attr({"fill":"none"}).attr("stroke-width",function(d,i){return "2"}).attr("d",path)
   .attr("stroke",function(d,i){
    return "#333333";
    //return borderColors[i];
  }).attr("stroke-dasharray","2, 1")
  
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
  //map colors, low-to-high, credit: Colorbrewer (http://colorbrewer2.org/) by Cynthia Brewer, Mark Harrower and The Pennsylvania State University

  


  
  /*if(indicator==="JOBS12" || indicator==="JOBS00"){
    var fmt = formats.uni("num");
    var MAP = function(d){return d.properties[indicator]};
  } 
  else if(indicator==="CH"){
    var fmt = formats.uni("pch");
    var MAP = function(d){
      if(d.properties["JOBS00"]===0){
        var val = null;
      }
      else{
        var val = (d.properties["JOBS12"]/d.properties["JOBS00"])-1;
      }
      return val;
    };
  }
  else if(indicator==="JOBSCHABS"){
    var fmt = formats.uni("numch");
    var MAP = function(d){return (d.properties["JOBS12"] - d.properties["JOBS00"])};
  }
  else{
    var fmt = formats.uni("pct");
    var MAP = function(d){return d.properties[indicator]/d.properties["JOBS12"]};
  } */

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

/*
  //filter out nulls
  var dat2 = [];
  for(var dd=0; dd<dat.length; dd++){
  	if(dat[dd] !== null){
  		dat2.push(dat[dd]);
  	}
  }

  var extremeTop = null;
  var extremeBot = null;


  dat2.sort(function(a,b){
	if(a<b){return -1}
  	else if(a>b){return 1}
  	else{return 0}
  })

  var median = d3.quantile(dat2, 0.5);

  var plarge = d3.quantile(dat2, 0.98);
  var psmall = d3.quantile(dat2, 0.02);

  var min = d3.min(dat);
  var min = 0;
  var max = d3.max(dat);
  var max = 0.4
  var maxAbs = d3.max([Math.abs(min),Math.abs(max)]);
  var actualMin = min;*/

  var AVG = SUM/NUM;

  /*var primaryCityMarker = d3.select("#primaryCityMarker");
  if(AVG < 0.25*maxAbs){
    MPAR.svg.tractOutlines.selectAll("path.tractMesh").filter(function(d,i){return i===1}).attr("stroke","#333333");
    primaryCityMarker.select("line").attr("stroke","#333333");
  }
  else{
    MPAR.svg.tractOutlines.selectAll("path.tractMesh").filter(function(d,i){return i===1}).attr("stroke","#ffcf1a");
    primaryCityMarker.select("line").attr("stroke","#ffcf1a");
  }*/

//create equal sized +/- sections
  /*if(actualMin >= 0){
    min = 0;
  }
  else{
    min = 0;
    max = maxAbs;
  };

  var ncols = 5;
  var lcols = actualMin < 0 ? ncols*2 : ncols;

  var qs = CP2016.scales.quantile30.domain([0,0.4]).range(range(ncols));
  var labcol = CP2016.color.lab;*/



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

  pbuttons.on("mousedown",function(d,i){
    indicator = d.c;
    getDrawTracts(CP2016.state.metro);
  });


  CP2016.drawTracts = getDrawTracts;

})(); //end closure