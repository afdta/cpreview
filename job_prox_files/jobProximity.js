(function(){
  var DATAREPO = "/~/media/multimedia/interactives/2016/concentratedPoverty/data/"
  var DATAREPO = "../data/";

  //formats
  var formats = {};
  formats.pch = d3.format("+,.1%");
  formats.pct = d3.format(",.1%");
  formats.rnk = d3.format("d");
  formats.num = d3.format(",.0f");
  formats.numch = d3.format("+,.0f");
  formats.doll = d3.format("$,.0f");
  formats.id = function(d){return d};
  formats.rnkth = function rs(r,inParens){
    if(!r){return "N/A"}
    inParens = !!inParens;
    //keep int versions
    var num = r;
    var mod = r%100; //for ranks beyond 100

    //coerce to string
    var r = r + "";
    var f = +(r.substring(r.length-1)); //take last letter and coerce to an integer
    
    //typical suffixes
    var e = ["th","st","nd","rd","th","th","th","th","th","th"];

    var rth = (mod>10 && mod<20) ? r + "th" : (r + e[f]); //handles exceptions for X11th, X12th, X13th, X14th
    
    if(inParens){return "("+rth+")"}
    else{return rth;} 
  }
  formats.uni = function(type){
    var fn = function(v){
      if(typeof v === "undefined" || v === null || isNaN(v) || !isFinite(v)){
        return "N/A";
      }
      else if(type in formats){
        return formats[type](v);
      }
      else{
        return "N/A";
      }
    }
    return fn;
  };

var rankIt = function(val, s_array){
  var reference = s_array.map(function(v,i,a){return v.value});
  try{
    var i = reference.indexOf(val) + 1;
    var rank = (i>0 && val!==null) ? formats.rnkth(i) : "N/A";
  }
  catch(e){
    if(!Array.prototype.indexOf){
      var rank = "Please upgrade browser to view ranks";
    }
    else{
      var rank = "N/A";
    }
  }
  finally{
    return rank;
  }
}  

//MAP VARIABLES
var MPAR = {};
MPAR.WIDTH = 950;
MPAR.HEIGHT = 730;
MPAR.CENTER = [MPAR.WIDTH/2,MPAR.HEIGHT/2];
MPAR.INITCENTER = MPAR.CENTER;
MPAR.SCALE = 1500;
MPAR.INITSCALE = MPAR.SCALE;

MPAR.wrap = d3.select("#mapWrap").style({"width":MPAR.WIDTH+"px","height":MPAR.HEIGHT+"px"});
MPAR.svg = {}
MPAR.svg.main = d3.select("#mapSVG").attr({"width":MPAR.WIDTH-2,"height":MPAR.HEIGHT});
MPAR.svg.tractGroupOuter = MPAR.svg.main.append("g"); //scale & translate this layer
//MPAR.svg.tractGroup = MPAR.svg.tractGroupOuter.append("g"); //scale this layer
MPAR.svg.tractGroup = MPAR.svg.tractGroupOuter.append("g"); 
MPAR.svg.hoverPath = MPAR.svg.tractGroupOuter.append("path").attr("class","hoverPath");
MPAR.svg.tractOutlines = MPAR.svg.tractGroupOuter.append("g");
MPAR.svg.annoGroup = MPAR.svg.main.append("g");
MPAR.svg.currentTracts = null;
MPAR.svg.currentGeoJson = null;
MPAR.zoom = {};
MPAR.zoom.in = d3.select("#zoomCtrlIn");
MPAR.zoom.out = d3.select("#zoomCtrlOut");
MPAR.zoom.scale = 1; //current zoom scale
MPAR.zoom.level = 0; //current zoom level in "levels" below
MPAR.zoom.levels = [1,2,3,5,8,12,17,23];
MPAR.zoom.yOffset = 55; //initial offset parameter
MPAR.zoom.translate = {x:0,y:MPAR.zoom.yOffset};

MPAR.input = {};
MPAR.input.countiesShown = true;
MPAR.input.showCounties = d3.select("#showCounties").classed("buttonSelected",MPAR.input.countiesShown);
MPAR.input.minorityFilter = d3.select("#minorityFilter");
MPAR.input.povertyFilter = d3.select("#povertyFilter");
MPAR.input.filter = {"poverty":false,"minority":false};

MPAR.input.indoptions = [
    {t:"Number of nearby jobs, 2012",id:"JOBS12"},
    {t:"Number of nearby jobs, 2000",id:"JOBS00"},
    {t:"Change in the number of nearby jobs, 2000–2012",id:"JOBSCHABS"},
    {t:"Percent change in the number of nearby jobs, 2000–2012",id:"CH"}
    ]
MPAR.input.indicator = MPAR.input.indoptions[3];
MPAR.input.metro = ""; 
MPAR.input.cbsa = null;

MPAR.input.MetroCitySuburb = "metro";
MPAR.input.indoptionsMetro = [
  [{"t":"Number of jobs near the average resident, 2000", id:"y2000", statType:"avg", format:formats.uni("num")},
  {"t":"Number of jobs near the average resident in high-poverty neighborhoods, 2000", id:"y2000Hp", statType:"tc", format:formats.uni("num")},
  {"t":"Number of jobs near the average resident in majority-minority neighborhoods, 2000", id:"y2000Mm", statType:"tc", format:formats.uni("num")}],
  [{"t":"Number of jobs near the average resident, 2012", id:"y2012", statType:"avg", format:formats.uni("num")},
  {"t":"Number of jobs near the average resident in high-poverty neighborhoods, 2012", id:"y2012Hp", statType:"tc", format:formats.uni("num")},
  {"t":"Number of jobs near the average resident in majority-minority neighborhoods, 2012", id:"y2012Mm", statType:"tc", format:formats.uni("num")}],
  [{"t":"Percent change in the number of jobs near the average resident, 2000–2012", id:"Change", statType:"avg", format:formats.uni("pch")},
  {"t":"Percent change in the number of jobs near the average resident in high-poverty neighborhoods, 2000–2012", id:"ChangeHp", statType:"tc", format:formats.uni("pch")},
  {"t":"Percent change in the number of jobs near the average resident in majority-minority neighborhoods, 2000–2012", id:"ChangeMm", statType:"tc", format:formats.uni("pch")}]
]
MPAR.input.indoptionsMetroSel = MPAR.input.indoptionsMetro[2][0];

MPAR.ttip = d3.select("#tooltip");

MPAR.title = {};
MPAR.title.metro = d3.select("#metroAreaName");
MPAR.title.metro2 = d3.select("#metroAreaName2")
MPAR.title.indicator = d3.select("#indicatorName");

MPAR.state = {};
MPAR.cache = {};


//object to hold metro data table parmaters
var dataTable = {};

//set initial parameters
MPAR.svg.tractGroupOuter.attr("transform","translate("+MPAR.zoom.translate.x+","+(MPAR.zoom.translate.y)+")");  

var proj = d3.geo.albersUsa().scale(1200).translate([475,320]);
var pathUS = d3.geo.path().projection(proj);

var path = d3.geo.path().projection(null);

//PAN FUNCITON
var panto = function(){
  var x = d3.event.x;
  var y = d3.event.y;
  var s = MPAR.zoom.scale;
  MPAR.zoom.translate.x = x;
  MPAR.zoom.translate.y = y;
  MPAR.svg.tractGroupOuter.attr("transform","translate("+x+","+y+") scale("+s+")");
}

var pan = d3.behavior.drag()
  .origin(function(){return MPAR.zoom.translate})
  .on("drag",panto)
  .on("dragstart",function(){
    if(MPAR.svg.currentTracts){
      MPAR.svg.currentTracts.attr("stroke","none");
    }
    MPAR.state.panning = true;
  }).on("dragend",function(){
    if(MPAR.svg.currentTracts){
      MPAR.svg.currentTracts.attr("stroke",MPAR.zoom.scale > 4 ? "#ffffff" : "none");
    }
    MPAR.state.panning = false;
  })


MPAR.wrap.call(pan);
//MPAR.wrap.on("dblclick.zoom",null); //remove double click listener from zoom behavior

var labScale = d3.interpolateLab("#ffffff","#053769");
var labScaleR = d3.interpolateLab("#ffffff","#ff5e1a");
var scales = {};
scales.lab = function(v){
  if(v){
    return v >= 0 ? labScale(v) : labScaleR(Math.abs(v));
  }
  else{
    return "#ffffff"; //NaN, null, undefined
  }
}

var rangeFinder = function(n){
  var range = [];
  for(var i=1;i<=n;i++){
    range.push(i);
  }
  return range;
}

scales.quantile30 = d3.scale.quantize().domain([0,1]).range([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]);
scales.quantile5 = d3.scale.quantize().domain([0,1]).range([1,2,3,4,5]);
var menuIndicators;
var shadeTracts = function(selection,geojson){
  var indicator = MPAR.input.indicator.id;
  
  if(indicator==="JOBS12" || indicator==="JOBS00"){
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
  } 

  var SUM = 0;
  var NUM = 0;

  var dat = geojson.features.map(function(d,i,a){
    var val = MAP(d);
    if(d.properties.CITY===1){
      SUM = SUM + val;
      NUM++;
    }
    return val;
  })
  var min = d3.min(dat);
  var max = d3.max(dat);
  var maxAbs = d3.max([Math.abs(min),Math.abs(max)]);
  var actualMin = min;

  var AVG = SUM/NUM;

  var primaryCityMarker = d3.select("#primaryCityMarker");
  if(AVG < 0.25*maxAbs){
    MPAR.svg.tractOutlines.selectAll("path.tractMesh").filter(function(d,i){return i===1}).attr("stroke","#333333");
    primaryCityMarker.select("line").attr("stroke","#333333");
  }
  else{
    MPAR.svg.tractOutlines.selectAll("path.tractMesh").filter(function(d,i){return i===1}).attr("stroke","#ffcf1a");
    primaryCityMarker.select("line").attr("stroke","#ffcf1a");
  }

//create equal sized +/- sections
  if(min >= 0){
    min = 0;
  }
  else{
    min = 0;
    max = maxAbs;
  };

  var ncols = 5;
  var lcols = actualMin < 0 ? ncols*2 : ncols;

  var qs = scales.quantile30.domain([min,max]).range(rangeFinder(ncols));

  //scales.lab will get called with -1, -0.8, -0.6, -0.4, -0.2, 0.2, 0.4, 0.6, 0.8, or 1 -- the fill will never be #ffffff
  selection.attr("fill",function(d,i){
    try{
      var v = MAP(d);
      var s = v < 0 ? -1 : 1;
      var t = (typeof v === "undefined" || v === null || isNaN(v) || !isFinite(v) ) ? null : qs(Math.abs(v))/ncols;
      var c = scales.lab(t*s);
    }
    catch(e){
      var c = "#ffffff";
    }
    return c;
  })

  MPAR.title.metro.text(MPAR.input.metro);
  MPAR.title.indicator.text(MPAR.input.indicator.t);
  if(dataTable.loadSummaryTable){dataTable.loadSummaryTable()};

  var step = 1/ncols;
  var hstep = step/2; //pick a value in center of range to avoid rounding issues
  //quantize determines quantile: [min, min+step],(min+step, min+2*step], ... , (min+(n-1)*step, min+n*step] -- note that rounding errors may cause some fuzziness at boundaries using this calc
  //console.log(scales.quantile30(min + 14*step - 0.0000000001));

  var sliceHeight = 20;
  var sliceDat = [];

  for(var i=0;i<ncols;i++){
    var upper = ((ncols-i)/ncols);
    var lower = ((ncols-i-1)/ncols);
    var upperV = upper*max;
    var lowerV = lower*max;
    var mid = (upperV+lowerV)/2;
    var quantile = qs(mid);
    
    sliceDat.push({l:fmt(lowerV), h:fmt(upperV), q:quantile, c:scales.lab(quantile/ncols), y:i*sliceHeight});

    if(actualMin < 0){
      var y_ = ncols*sliceHeight;
      sliceDat.push({h:fmt(0-lowerV), l:fmt(0-upperV), q:quantile, c:scales.lab(0-(quantile/ncols)), y:y_+((ncols-i-1)*sliceHeight)});
    }
  }

  sliceDat.sort(function(a,b){return a.y-b.y});

  var tractSVG = d3.select("#tractLegend svg");
  var rectG = tractSVG.selectAll("g.legendSlice").data(sliceDat);
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

  primaryCityMarker.attr("transform","translate(20,"+ (sliceDat.length*sliceHeight+50) +")");

};


//build menu
(function(){
  var tbody = d3.select("#indicatorGroup table tbody");
  var tr = tbody.selectAll("tr").data(MPAR.input.indoptions);
  tr.enter().append("tr").append("td").text(function(d,i){return d.t}); //.style({"padding":"5px 5px 5px 5px"});
  tr.classed("selected",function(d,i){return i===0});
  tr.on("mousedown",function(d,i){
    if(MPAR.svg.currentTracts && MPAR.svg.currentGeoJSON){
      tr.classed("selected",false);
      d3.select(this).classed("selected",true);
      MPAR.input.indicator = d;
      shadeTracts(MPAR.svg.currentTracts,MPAR.svg.currentGeoJSON);
    }
  });
  menuIndicators = tr;
  var menuOpen = false;
  var menuButton = d3.select("#mapOptionsButton");
  var menuCloseButton = d3.select("#mapOptionsClose");
  var menuOptions = d3.select("#menu").style({"opacity":"0","display":"none"});
  menuButton.on("mousedown",function(){
    menuOpen = !menuOpen;
    if(menuOpen){menuOptions.style("display","block").transition().style("opacity",1);}
    else{menuOptions.style("display","none").style("opacity",0);}
    d3.event.stopPropagation();
  })
  var menuCloseFn = function(){
    menuOpen = false;
    menuOptions.style("display","none").style("opacity",0);    
  }

  d3.select("#mapWrapOuter").on("mousedown",menuCloseFn);
  menuCloseButton.on("mousedown",menuCloseFn);

  menuOptions.on("mousedown",function(){
    d3.event.stopPropagation(); //prevent clicks in menu from closing menu
  })
})();


var showHideCounties = function(forceShow){
  if(MPAR.svg.tractOutlines){
    d3.event.stopPropagation();
    try{
      var touchEvent = d3.event.type.search(/touch/i) > -1;
    }
    catch(e){
      var touchEvent = false; //no d3.event if this is triggered programatically
    }
    if(touchEvent){
      d3.event.preventDefault();
    }
    if(forceShow){
      MPAR.input.countiesShown = true;
    }
    else{
      MPAR.input.countiesShown = !MPAR.input.countiesShown;
    }
    MPAR.svg.tractOutlines.select("path").style("visibility",MPAR.input.countiesShown ? "visible" : "hidden");
    MPAR.input.showCounties.classed("buttonSelected",MPAR.input.countiesShown);
  }
}

MPAR.input.showCounties.on("touchstart",showHideCounties);
MPAR.input.showCounties.on("mousedown",showHideCounties);


var filterTracts = function(){
  if(MPAR.svg.currentTracts){
    var name = d3.select(this).attr("id");
    var filter = name.search(/poverty/i) > -1 ? "poverty" : (name.search(/minority/i) > -1 ? "minority" : null);
    MPAR.input.filter[filter] = !MPAR.input.filter[filter];
    MPAR.input.minorityFilter.classed("buttonSelected",MPAR.input.filter.minority);
    MPAR.input.povertyFilter.classed("buttonSelected",MPAR.input.filter.poverty);


    if(MPAR.input.filter["minority"] || MPAR.input.filter["poverty"]){
      showHideCounties(true);
    }

    try{
      var touchEvent = d3.event.type.search(/touch/i) > -1;
    }
    catch(e){
      var touchEvent = false; //no d3.event if this is triggered programatically
    }
    if(touchEvent){
      d3.event.preventDefault();
    }
    MPAR.svg.currentTracts.style("visibility",function(d,i){
      if(MPAR.input.filter.minority && MPAR.input.filter.poverty){
        if(d.properties.MINSH >= 0.5 && d.properties.POVSH >= 0.2){
          return "visible";
        }
        else{
          return "hidden";
        }
      }
      else if(MPAR.input.filter.minority && d.properties.MINSH >= 0.5){
        return "visible";
      }
      else if(MPAR.input.filter.poverty && d.properties.POVSH >= 0.2){
        return "visible";
      }
      else if(!MPAR.input.filter.poverty && !MPAR.input.filter.minority){
        return "visible";
      }
      else{
        return "hidden";
      }
    })
  }
  //console.log(MPAR.filter);
};

var resetFilters = function(){
  MPAR.input.filter.minority = false;
  MPAR.input.filter.poverty = false;
  MPAR.input.minorityFilter.classed("buttonSelected",false);
  MPAR.input.povertyFilter.classed("buttonSelected",false); 
}

MPAR.input.minorityFilter.on("touchstart",filterTracts);
MPAR.input.minorityFilter.on("mousedown",filterTracts);
MPAR.input.povertyFilter.on("touchstart",filterTracts);
MPAR.input.povertyFilter.on("mousedown",filterTracts);


//tracts that should be represented as cities on map but aren't in shapefile
var tractRecode = {'08031980100':1,
                    '08059980000':1,
                    '13121003700':1,
                    '17031381700':1,
                    '17031835700':1,
                    '17031980100':1,
                    '19153011600':1,
                    '21111980100':1,
                    '22033980000':1,
                    '22071004402':1,
                    '25025981700':1,
                    '26163985900':1,
                    '29095980802':1,
                    '36005016300':1,
                    '36005017100':1,
                    '36005024900':1,
                    '36047008600':1,
                    '36047015400':1,
                    '36047017700':1,
                    '36047096000':1,
                    '36081024600':1,
                    '36081029900':1,
                    '36081065501':1,
                    '36081121100':1,
                    '37119980300':1,
                    '42003980800':1,
                    '42003981200':1,
                    '42101980500':1,
                    '42101980600':1,
                    '47037980100':1,
                    '48029980004':1,
                    '48215980000':1}

//median commute distances
var commDistance = 
{'10420':6.11310020032422,
'10580':7.05649981805407,
'10740':6.6489297146906,
'10900':5.88204256854545,
'12060':12.8252523804959,
'12260':7.02185032097502,
'12420':8.59549861045742,
'12540':5.64425271468318,
'12580':8.57397692351129,
'12940':8.01818181910181,
'13820':10.0785996245222,
'14260':6.00675958459024,
'14860':5.41723084661213,
'15380':6.52871639529674,
'15980':7.26908972819936,
'16700':8.00679592422462,
'16740':9.66713795955821,
'16860':7.5020702712342,
'16980':9.96168218098311,
'17140':8.66964592493795,
'17460':7.83054966313137,
'17820':5.90324847650322,
'17900':9.00919701463856,
'18140':8.59069361189248,
'19100':12.1606656870015,
'19380':6.5620046459066,
'19660':5.92999022707744,
'19740':8.48898947697591,
'19780':6.37708979870915,
'19820':10.3665408274582,
'21340':6.98010007246663,
'23420':5.60988941191953,
'24340':7.2016687374047,
'24660':6.87213657165305,
'24860':7.98002407784629,
'25420':6.00217478515896,
'25540':7.28091720648592,
'26420':12.1798990284623,
'26900':9.23260236873859,
'27140':8.71733814751673,
'27260':9.06294143095225,
'28140':8.90315743916293,
'28940':9.10285144340363,
'29460':6.84645759922885,
'29820':7.21042984655807,
'30780':8.14679548457367,
'31080':8.82988392895898,
'31140':7.58834520511829,
'31540':6.84112575755451,
'32580':6.42154159146375,
'32820':8.86351843704609,
'33100':8.57620652818723,
'33340':7.42164990183998,
'33460':9.46765646279099,
'34980':10.9951761122857,
'35300':5.0430819809836,
'35380':6.19962469266415,
'35620':7.70079876423629,
'35840':5.87435332573471,
'36260':5.70692924178365,
'36420':8.55884234348444,
'36540':6.01566520085041,
'36740':9.07022675471617,
'37100':5.25909765149009,
'37340':6.55409329890635,
'37980':7.77309458854253,
'38060':11.4104628485092,
'38300':8.13392932414241,
'38900':7.11813084387163,
'39340':5.50116578164051,
'39580':8.48885029244802,
'40060':8.69942383313922,
'40140':9.13512394711555,
'40380':7.34809515140652,
'40900':8.00996646090188,
'41180':9.96349577520973,
'41620':6.47891787667683,
'41700':8.80937704063007,
'41740':8.52503010344395,
'41860':8.04356913704095,
'41940':6.37434807952886,
'42540':5.22648173549855,
'42660':9.03276622898603,
'44060':5.63676678254272,
'44700':4.71596767547411,
'45060':6.51570215810368,
'45300':8.53256070971264,
'45780':6.02471329390258,
'46060':7.28477732071226,
'46140':7.95864113537027,
'46520':6.55557272890001,
'47260':7.54787243424647,
'47900':9.04715340139954,
'48620':6.73457068768941,
'49180':7.07014603199001,
'49660':5.79806654235577}




///////////////DIVEX TOOLTIP METHODS
//tooltip show/hide methods
var tooltip_title = d3.select("#tooltip_title");
var currentGeo = null;
var hideTipTimer;
var tipLeft = true;

//show the tooltip -- to be used as an event callback
var showtip = function(d,i){
  if(!MPAR.svg.currentTracts){
    MPAR.ttip.style({"display":"none"});
    return null;
  }
  
  clearTimeout(hideTipTimer);
  var thiz = d3.select(this);
  var pathD = thiz.attr("d");

  MPAR.svg.hoverPath.attr("d",pathD).transition().duration(0).style("opacity",1);

  var touchEvent = d3.event.type.search(/touch/i) > -1;
  var mousemove = d3.event.type.search(/mousemove/i) > -1;
  var touchmove = d3.event.type.search(/touchmove/i) > -1;

  var geo = d.id;
  if(touchEvent){
    d3.event.preventDefault();
    d3.event.stopPropagation();
    try{
      var coord = d3.touches(MPAR.wrap.node())[0];
      var x = coord[0] > 360 ? Math.round(coord[0]-305-55) + "px" : Math.round(coord[0]+55) + "px"; //flip L-R
      var y = coord[1] >= 325 ? (325-55)+"px" : (coord[1] >= 55 ? Math.round(coord[1]-55) + "px" : "0px");
      MPAR.ttip.style({"left":x, "top":y, "position":"absolute", "display":"block"});
      filltip(d);
    }
    catch(e){
      MPAR.layer.ttip.style("display","none");
    }
  }
  else{
    var coord = d3.mouse(MPAR.wrap.node());
    
    //set x-coord and avoid unnecessary "flipping" of tip position
    if(coord[0] <= 360 || (!tipLeft && coord[0] < 590)){
      tipLeft = false;
      var x = Math.round(coord[0]+55)+"px";
    }
    else{
      tipLeft = true;
      var x = Math.round(coord[0]-305-55) + "px";
    }

    var y = coord[1] >= 325 ? (325-55)+"px" : (coord[1] >= 55 ? Math.round(coord[1]-55) + "px" : "0px");
    MPAR.ttip.style({"left":x, "top":y, "position":"absolute", "display":"block"});

    if(!mousemove){
      filltip(d);
    }
  }
}

var nfmt1 = d3.format(",.1f")

//called by showtip
filltip = function(td){
  var tab0 = d3.select("#ttip_table0").select("tbody");
  var tab1 = d3.select("#ttip_table1").select("tbody");
  var overview = d3.select("#tractOverview");
  d3.select("#milesDistance").text(nfmt1(commDistance[td.properties.CBSA]));

  var props = td.properties;
  tooltip_title.text("Neighborhood details");
  d3.select("#tooltip_title2").html("Census tract:<br/>"+ td.id);
  try{
    var place = props.CITY===1 ? "the city of " : "the <b>suburban</b> portion of the metro area."
    var place = props.PLID in dataTable.placeData ? place + "<b>"+ dataTable.placeData[props.PLID][0]+ "</b>." : place;
    if(td.id in tractRecode){
      place="the <b>city</b> portion of the metro area."
    }
  }
  catch(e){
    var place = null;
  }

  try{
    var fips = td.id.substring(0,5);
    if(fips in dataTable.countyData){
      var cd = dataTable.countyData[fips][0]
      var county = cd.CountyName !== cd.StateName ? cd.CountyName + ", " + cd.StateName : cd.CountyName;
    }
  }
  catch(e){
    var county = "[county data not available]";
  }

  var nfmt = formats.uni("num");
  var numch = formats.uni("numch");
  var pch = formats.uni("pch");
  var pct = formats.uni("pct");

  var d0 = [
    ["Total nearby jobs, 2012",nfmt(props.JOBS12)],
    ["Total nearby jobs, 2000",nfmt(props.JOBS00)],
    ["Change in the number of nearby jobs, 2000–2012",numch(props.JOBS12-props.JOBS00)],
    ["Percent change in the number of nearby jobs, 2000–2012",pch((props.JOBS12/props.JOBS00)-1)]
  ]

  var d1 = [
    ["Total population, 2009–13",nfmt(props.POP13)],
    ["Poverty rate, 2009–13",pct(props.POVSH)],
    ["Minority share of the population, 2009–13",pct(props.MINSH)],
  ]

  overview.html("This tract is located in <b>" + county + "</b> and is in " + place);

  var r0 = tab0.selectAll("tr").data(d0);
  r0.enter().append("tr");
  r0.exit().remove();
  var c0 = r0.selectAll("td").data(function(d,i){return d});
  c0.enter().append("td");
  c0.exit().remove();
  c0.text(function(d,i){return d});
  c0.attr("style",function(d,i){
    return i===0 ? "width:75%;padding-right:5%;" : "width:20%;text-align:right;";
  })

  var r1 = tab1.selectAll("tr").data(d1);
  r1.enter().append("tr");
  r1.exit().remove();
  var c1 = r1.selectAll("td").data(function(d,i){return d});
  c1.enter().append("td");
  c1.exit().remove();
  c1.text(function(d,i){return d});
  c1.attr("style",function(d,i){
    return i===0 ? "width:75%;padding-right:5%;" : "width:20%;text-align:right;";
  })

}

var hidetip = function(){
  hideTipTimer = setTimeout(function(){
    MPAR.ttip.style("display","none");
    MPAR.svg.hoverPath.attr("d","M0,0").transition().duration(250).style("opacity",0);
  },500);
}
//end tooltip


//combine draw functions into one that renders to svg and/or canvas
var drawSVG = function(gj, fill, meshes){
  var sel = MPAR.svg.tractGroup.selectAll("path.tract").data(gj.features);
  sel.exit().remove();
  sel.enter().append("path").classed("tract",true);
  sel.attr("d",path).attr({"stroke":"none","stroke-width":(0.25/MPAR.zoom.scale)+"px"}).attr("pointer-events","all").style("visibility","visible");

  sel.on("mouseover",showtip);
  sel.on("mousemove",showtip);
  sel.on("touchstart",showtip);
  MPAR.svg.tractGroup.on("mouseleave",hidetip);

  MPAR.svg.hoverPath.attr({"fill":"#fbfbfb","stroke":"#666666","stroke-width":"1px"}).style("pointer-events","none");
  var t = MPAR.svg.hoverPath.node();
  t.parentNode.appendChild(t);

  var timer;

  MPAR.svg.currentTracts = sel;
  MPAR.svg.currentGeoJSON = gj;  

  MPAR.svg.tractOutlines.selectAll("path.tractMesh").remove();//blank slate insures proper draw order
  var m = MPAR.svg.tractOutlines.selectAll("path.tractMesh").data(meshes);
  m.exit().remove();
  m.enter().append("path").classed("tractMesh",true);
  var borderColors = ["#555555","#ffcf1a"]; //metro & county, city(ies) "#e8a717"
  m.attr({"fill":"none"}).attr("stroke-width",function(d,i){return ((i+1)/MPAR.zoom.scale)+"px"}).attr("d",path).attr("stroke",function(d,i){return borderColors[i]});
  
  //select first (county) path and show or hide
  MPAR.svg.tractOutlines.select("path").style("visibility",MPAR.input.countiesShown ? "visible" : "hidden");
  //m.attr("stroke-dasharray",function(d,i){return i===0 ? "8,3" : "none"})

  shadeTracts(sel,gj);
};


var zoomInOut = function(inTrueOutFalse){
  d3.event.preventDefault(); //prevent use of zoom button from interacting with zoom behavior on mapWrap
  d3.event.stopPropagation();
  var recenter = null;
   
  
  var currentZoom = MPAR.zoom.scale;
  var cX = MPAR.zoom.translate.x;
  var cY = MPAR.zoom.translate.y;
  
  var dX = (MPAR.CENTER[0]-cX)/currentZoom; //translate in native coordinates
  var dY = (MPAR.CENTER[1]-cY)/currentZoom;

  if(inTrueOutFalse){
    var newlevel = MPAR.zoom.level+1;
    var zoomValid = newlevel < MPAR.zoom.levels.length;
    MPAR.zoom.level = zoomValid ? newlevel : MPAR.zoom.levels.length-1;

  }
  else{
    var newlevel = MPAR.zoom.level-1;
    var zoomValid = newlevel >= 0;
    MPAR.zoom.level = zoomValid ? newlevel : 0;
    if((!zoomValid || newlevel===0) && MPAR.zoom.translate.x !== 0){
      var recenter = true;
    }
  }

  MPAR.zoom.out.classed("noMoreZoom",MPAR.zoom.level <= 0);
  MPAR.zoom.in.classed("noMoreZoom",MPAR.zoom.level >= MPAR.zoom.levels.length-1);

  var newZoom = MPAR.zoom.levels[MPAR.zoom.level];

  if(recenter){
    var targetX = 0;
    var targetY = 0 + MPAR.zoom.yOffset;
  }
  else if(!zoomValid){
    return null; //no-op
  }
  else{
    var targetX = MPAR.CENTER[0]-(dX*newZoom); //scaled translate
    var targetY = MPAR.CENTER[1]-(dY*newZoom);
  }

  MPAR.zoom.scale = newZoom;
  MPAR.zoom.translate.x = targetX;
  MPAR.zoom.translate.y = targetY;
  
  MPAR.svg.tractGroupOuter.attr("transform","translate("+targetX+","+targetY+") scale("+newZoom+")");
  if(MPAR.svg.currentTracts){
    MPAR.svg.currentTracts.attr("stroke",MPAR.zoom.scale > 2 ? "#ffffff" : "none");
    MPAR.svg.currentTracts.attr("stroke-width",(0.25*(1/newZoom))+"px");
  }

  if(MPAR.svg.tractOutlines){
    MPAR.svg.tractOutlines.selectAll("path").attr("stroke-width",function(d,i){return ((i+1)/MPAR.zoom.scale)+"px"});
  }

  MPAR.svg.hoverPath.attr("stroke-width",(1/MPAR.zoom.scale)+"px");

}

MPAR.zoom.in.on("mousedown",function(d,i){zoomInOut(true);});
MPAR.zoom.out.on("mousedown",function(d,i){zoomInOut(false);});


var tractDB = {};
var getDrawTracts = function(cbsa,name){
  var uri = DATAREPO + "tracts_final/" + cbsa + ".json";
  MPAR.input.metro = name;
  MPAR.input.cbsa = cbsa;

  var processDat = function(dat){
    MPAR.wrap.style("visibility","visible"); //this could be hidden if there was an error
    //reset options
    menuIndicators.classed("selected",function(d,i){return i===3});
    MPAR.input.indicator = MPAR.input.indoptions[3]; //drawing SVG defaults back to change in jobs
    resetFilters();

    var geoJSON = topojson.feature(dat,dat.objects.tracts);
    var mesh = topojson.mesh(dat,dat.objects.tracts);

    var meshCity = topojson.mesh(dat,dat.objects.tracts,function(a,b){
      //1&2) See if tract is in recode list and determine if it borders another city tract (if so, don't draw border)
      //3) if at least one geometry is a city and their place FIPS don't match, draw border
      //4) if the geometries are the same and a city, they are on the border (i.e. they don't share a border with any other geos)
      //5) special case for tract recodes
      //Note: city recoded tracts that lie on the border between two different cities will result in a gap in the border between cities (there is no PLID available for recodes)
      if(a.id in tractRecode){
        if(b.properties.CITY===1 || b.id in tractRecode){var keep=false}
        else{var keep=true}
      }
      else if(b.id in tractRecode){
        if(a.properties.CITY===1){var keep=false}
        else{var keep=true}
      }
      else if((a.properties.CITY || b.properties.CITY) && (a.properties.PLID !== b.properties.PLID)){
        var keep = true; 
      }
      else if(a.properties.CITY ===1 && a===b){
        var keep = true;
      }
      else{
        var keep = false;
      }
      return keep;
    });
    var meshCounty = topojson.mesh(dat,dat.objects.tracts,function(a,b){return a.id.substring(0,5) !== b.id.substring(0,5) || (a===b)});

    drawSVG(geoJSON, true, [meshCounty,meshCity]);
    //drawCanvas(geoJSON,MPAR.canvas);   
  } 

  if(cbsa in tractDB){
    processDat(tractDB[cbsa]);
  }
  else{
    d3.json(uri, function(error, dat){
      if (error){
        MPAR.title.metro.text("ERROR RETRIEVING DATA");
        MPAR.wrap.style("visibility","hidden");
        return null;
      }
      else{
        tractDB[cbsa] = dat;
        processDat(dat);
      }
    });
  }
}
getDrawTracts(47900,"Washington-Arlington-Alexandria, DC-VA-MD-WV");

//DATATABLE
dataTable.pull = d3.select("#JP15TablePull"); //input text field
dataTable.wrap = d3.select("#JP15Select");
dataTable.tableWrap = d3.select("#JP15TableWrap").style({"height":(MPAR.HEIGHT-90)+"px"});
dataTable.table = d3.select("#JP15Table");
dataTable.head = d3.select("#JP15HeaderTable");
dataTable.open = false;
dataTable.sortIndex = 0;
dataTable.cols = [
                  {t:"Metro Area",w:47,asc:true,fmt:formats.id,right:false,padLR:[1,1]}, //, 
                  {t:"Number of jobs near the average resident, 2012",w:22,asc:true,fmt:formats.num,right:true,padLR:[1,2]},
                  {t:"Percent change in the number of jobs near the average resident, 2000–2012",w:31,asc:true,fmt:formats.pch,right:true,padLR:[2,1]}
                  ];
dataTable.data = null;
dataTable.placeData = null;
dataTable.countyData = null;
dataTable.metroData = null;
dataTable.setData = function(dat){
  var arr = dat.metrodata.list.map(function(d,i,a){
    return {data:[d.CBSA_Title,
            dat.metrodata.avg.metro[d.CBSA_Code][0].y2012,
            (dat.metrodata.avg.metro[d.CBSA_Code][0].y2012/dat.metrodata.avg.metro[d.CBSA_Code][0].y2000)-1
            ], id:d.CBSA_Code};
  })
  dataTable.data = arr.sort(function(a,b){return a.data[0] <= b.data[0] ? -1 : 1});
  dataTable.placeData = dat.placedata;
  dataTable.countyData = dat.countydata;
  dataTable.metroData = dat.metrodata;
}

//getData depends on having the current indoptionsMetroSel selected as well as the MPAR.input.MetroCitySuburb. 
//Each change of those should prompt new accessor and redraw

dataTable.getData = function(){
  var US = {
    metro:{
      "y2000":356474.8,
      "y2012":330763.9,
      "y2000Mm":579601.5,
      "y2012Mm":480405,
      "y2000Hp":607918.5,
      "y2012Hp":465642,
      "Change":-0.072125435,
      "ChangeHp":-0.2340387733,
      "ChangeMm":-0.1711460374
    },
    city:{
      "y2000":627212.1,
      "y2012":605366.6,
      "y2000Mm":738102.7,
      "y2012Mm":664876.1,
      "y2000Hp":755897.1,
      "y2012Hp":647893.9,
      "Change":-0.0348295258,
      "ChangeHp":-0.1428808233,
      "ChangeMm":-0.0992092293
    },
    suburbs:{
      "y2000":223365.1,
      "y2012":207158.4,
      "y2000Mm":376490.3,
      "y2012Mm":316961.9,
      "y2000Hp":292808.3,
      "y2012Hp":242911,
      "Change":-0.072556993,
      "ChangeHp":-0.1704094454,
      "ChangeMm":-0.1581140337     
    }
  }

  if(this.metroData){
    var metroData = this.metroData;
    var option = MPAR.input.indoptionsMetroSel;
    try{
      var dat = metroData[option.statType][MPAR.input.MetroCitySuburb];
      
      var arr = [];
      for(var p in dat){
        if(dat.hasOwnProperty(p)){
          arr.push({"value":dat[p][0][option.id],"CBSA_Title":dat[p][0]["CBSA_Title"], "CBSA_Code":dat[p][0]["CBSA_Code"]});
        }
      }

      var sortFn = function(a,b){
        if(a.value===null){return 1}
        else if(b.value===null){return -1}
        else{
          return b.value-a.value;
        }
      }

      arr.sort(sortFn);

      var max = d3.max(arr,function(d){return d.value});
      var min = d3.min(arr,function(d){return d.value});
      
      var fn = function(geo){
        var val = dat[geo][0][option.id];
        return val;
      }

      fn.data = arr;
      fn.us = {"value":US[MPAR.input.MetroCitySuburb][option.id],"CBSA_Title":"96 metro area average","CBSA_Code":"US"};
      fn.sortFn = sortFn;
      fn.max = max;
      fn.min = min;
      fn.option = option;
      fn.format = option.format;
      fn.type = option.id.search(/change/i) > -1 ? "change" : "avg";
    }
    catch(e){
      var fn = null;
    }
    return fn;
  }
  else{
    return null;
  }
}

//bar chart
dataTable.chartBlank = true;
var showLabels = false;
dataTable.draw = function(customBarHeight){
  var w = 550;
  var bh = customBarHeight ? customBarHeight : 7;
  var h = (bh+1)*100;
  var v = dataTable.getData();
  var maxAvg = 1852378; //city, high poverty tracts
  var maxPct = 0.66;

  var bcWrap = d3.select("#barChart").style("visibility","visible");
  if(v===null){
    bcWrap.style("visibility","hidden");
    bcWrap.select("#plotArea").selectAll("g.bars").remove();
    return null;
  }

  if(v.type==="avg"){
    var min = 0;
    var max = maxAvg;
    var zero = 0;
    var bw = w;

  }
  else{
    var min = 0-maxPct;
    var max = maxPct;
    var zero = 275;
    var bw = zero;
  }

  var X = d3.scale.linear().domain([min,max]).range([0,w]);

  var dist = max-min;
  var gl = function(avg,zeroVal){
    var a = [];
    if(avg){
      var start = 0;
      var step = 300000;
    } else{
      var start = -0.6;
      var step = 0.2;
    }
    var absRange = max-min;
    for(var i=0; i<7; i++){
      var iStep = i*step;
      a.push({v:start+iStep, l:v.format(start+iStep), x: X(start+iStep)});
    }
    return a;
  }

  var gL = gl(v.type==="avg");

  var dur1 = dataTable.chartBlank ? 250 : 700;
  var dur2 = 1800;
  d3.select("#barChartTitle").text(v.option.t);
  var bc = bcWrap.select("#plotArea");

  //start building plot
  var barDat = v.data.concat(v.us);
  barDat.sort(v.sortFn);


  //text labels and bars
  var text = d3.select("#barChartAnno").selectAll("text.labels").data(barDat,function(d,i){return d.CBSA_Code});    
  var bars = bc.selectAll("g.bars").data(barDat,function(d,i){return d.CBSA_Code});
  
  var bEnter = bars.enter().append("g").classed("bars",true)
  bEnter.append("path").attr("d","M0,0 l"+916+",0 " + "l0,"+bh+" l-"+1000+",0 z").attr({"stroke":"none","fill":"none"});
  bEnter.append("rect");

  bars.exit().remove();
  bars.style("pointer-events","all");

  text.enter().append("text").classed("labels",true).style({"font-size":"9px","pointer-events":"none","fill":"#333333"}).attr({"x":zero+2,"y":0});
  text.text(function(d,i){return d.CBSA_Title});

  //ADD A U.S. LABEL
  var USLABEL = bars.filter(function(d,i){return d.CBSA_Code==="US"}).selectAll("text").data([0]);
  USLABEL.enter().append("text").attr("id","barChartAnno-US");
  USLABEL.text("96 metro area average")
    .attr({"y":8})
    .attr("x",function(d,i){
      return v.type==="avg" ? Math.abs(bw*(v.us.value/max))+4 : zero+4;
    })
    .style({"font-size":"13px","font-style":"italic","fill":"#999999"})
    .transition().duration(0).style("opacity",0);

  //transition 1 - bar widths and text x-pos
  bars.select("rect")
    .attr({"y":0,"height":bh,"stroke":"none","stroke-width":"1px"})
    .classed("reference-bar",function(d,i){return d.CBSA_Code==="US"})
    .transition().duration(dur1)
    .attr("width",function(d,i){return Math.abs(bw*(d.value/max))})
    .attr("x",function(d,i){
      if(v.type==="avg"){
        return 0;
      } else{
        var val = d.value;
        var abs = Math.abs(bw*(val/max));
        return val < 0 ? zero - abs : zero;  
      }
    })
    .each("start",function(d,i){
    if(i===0){
      bcWrap.classed("crispEdges",false);
    }
  });
  var textTrans = text.transition().duration(dur1).delay(0).attr("x",zero+2); 
  
  bars.style("pointer-events","none"); //prevent user from seeing tooltip during transition

  //transition 2a and 2b (2a is a dummy transition to stop any others)
  var barTrans = bars.transition().duration(0);
  barTrans.transition().delay(dur1).duration(dur2).attr("transform",function(d,i){
    return "translate(0," + ((i*bh)+i) + ")";
  })
  .each("end",function(d,i){
    if(i===0){
      bcWrap.classed("crispEdges",true);
      USLABEL.transition().style("opacity",1);
    }
    d3.select(this).style("pointer-events","all");
  })

  textTrans.transition().duration(dur2).attr("y",function(d,i){
    return ((i*bh)+i+7);
  })


  var ttip = d3.select("#barChartTip");
  ttip.select("rect");
  var ttipText = ttip.select("text").text("...");

  //var textMouseOver;
  var barMouseEnter = function(d,i){
    var thiz = d3.select(this);
    var val = d.value;
    var rank = d.CBSA_Code==="US" ? "" : " (Rank: "+ rankIt(val,v.data) +")";

    bars.select("path").attr("fill","none"); //reset on touch devices
    bars.select("rect").attr("fill-opacity","1"); //reset

    thiz.select("rect").attr("fill-opacity","0.5");
    thiz.select("path").attr("fill","#dddddd");
    //thiz.select("text").style("visibility","hidden");
    var tform = thiz.attr("transform");
    ttip.attr("transform",tform);
    ttipText.text(d.CBSA_Title + ": " + v.format(val) + rank);
    ttip.style("visibility","visible");
    //textMouseOver = text.filter(function(td){return td.CBSA_Code===d.CBSA_Code}).style("visibility","hidden");
  }

  var barMouseLeave = function(d,i){
    var thiz = d3.select(this);
    thiz.select("rect").attr("fill-opacity","1");
    thiz.select("path").attr("fill","none");
    //thiz.select("text").style("visibility", !showLabels ? "visible" : "hidden");
    ttip.style("visibility","hidden");
    //textMouseOver.style("visibility", showLabels ? "visible" : "hidden");
  }

  //mouse events
  bars.on("mouseenter",barMouseEnter);
  bars.on("mouseleave",barMouseLeave);
  //touch events
  bars.on("touchstart",barMouseEnter);
  bars.on("touchend",barMouseLeave);

  var grid = d3.select("#barChartGrid").style("pointer-events","none");
  var gridLines = grid.selectAll("g").data(gL);
  var gridLinesEnter = gridLines.enter().append("g")
  gridLinesEnter.append("path").style("shape-rendering","crispEdges");
  gridLinesEnter.append("text").attr({"y":9,"x":0}).style({fill:"#333333","font-size":"11px"}).style("text-anchor",function(d,i){return i===0 ? "start" : "middle"});
  gridLines.exit().remove();
  gridLines.transition().duration(dur1).attr("transform",function(d,i){
    return "translate("+d.x+",0)";
  })
  gridLines.select("path").attr("d","M0,13 l0,"+h).attr({"stroke":"#dddddd"});
  gridLines.select("text").text(function(d,i){return d.l});

  dataTable.chartBlank = false;

}


dataTable.move = function(openTrueCloseFalse,callback){
  var open; //should it be open or closed?
  if(openTrueCloseFalse === true){open = true} //override
  else if(openTrueCloseFalse === false){open = false} //override
  else{open = !dataTable.open}

  //if(!open){d3.select("#menu").style("visibility","visible");} //immediately show menu
  //if the "to be" (open) state doesn't match the current state
  if(open !== dataTable.open){
    dataTable.open = open;
    
    dataTable.wrap.transition().duration(500).style("height",!open ? "0px" : MPAR.HEIGHT + "px").each("end",function(d,i){
      if(callback){callback();}
      if(!open){
        dataTable.pull.node().value = null;
        if(dataTable.data && dataTable.sortDraw){dataTable.sortDraw(dataTable.data,dataTable.sortIndex,true);}
      }
      //if(open){d3.select("#menu").style("visibility","hidden");}
    });
  }
}

dataTable.populate = function(dat){
  var body = dataTable.table.select("tbody");
  var rows = body.selectAll("tr").data(dat);
  rows.enter().append("tr");
  rows.exit().remove();
  //rows.classed("boldRow",function(d,i){return i===0 ? true : false});
  var headRow = dataTable.head.select("tbody").selectAll("tr").data([dataTable.cols]);
  headRow.enter().append("tr");
  headRow.exit().remove();
  var headCells = headRow.selectAll("td").data(function(d,i){return d});
  headCells.enter().append("td");
  headCells.exit().remove();
  headCells.text(function(d,i){return d.t})
    .style("width",function(d,i){return (d.w-d.padLR[0]-d.padLR[1])+"%"})
    .style("text-align",function(d,i){return d.right ? "right" : "left"})
    .style("padding",function(d,i){var pad = d.padLR; return "5px " + (pad[1]+"% ") + "5px " + (pad[0]+"%")});
  headCells.on("mousedown",function(d,i){
    document.getElementById("JP15TableWrap").scrollTop = 0;
    dataTable.sortDraw(dat,i);
  });

  var cells = rows.selectAll("td").data(function(d,i){return d.data});
  cells.enter().append("td");
  cells.exit().remove();
  cells.text(function(d,i){return dataTable.cols[i].fmt(d)})
    .style("width",function(d,i){var pad = dataTable.cols[i].padLR;  return (dataTable.cols[i].w-pad[0]-pad[1])+"%"})
    .style("text-align",function(d,i){return dataTable.cols[i].right ? "right" : "left"})
    .style("padding",function(d,i){var pad = dataTable.cols[i].padLR; return "5px " + (pad[1]+"% ") + "5px " + (pad[0]+"%")});


  rows.on("mousedown",function(d,i){
    var fn = function(){
      getDrawTracts(d.id,d.data[0]);
    }
    dataTable.move(false,fn);
  })
}

dataTable.sortDraw = function(dat,sortIndex,doNotRecordSort){
  var cp = dat.slice(0);
  var asc = dataTable.cols[sortIndex].asc;
  if(!doNotRecordSort){dataTable.cols[sortIndex].asc = !asc;} //by default, reverse for next click
  if(asc){cp.sort(function(a,b){return a.data[sortIndex] <= b.data[sortIndex] ? -1 : 1;})}
  else{cp.sort(function(a,b){return b.data[sortIndex] > a.data[sortIndex] ? 1 : -1;})}
  dataTable.populate(cp);
  dataTable.sortIndex = sortIndex;
}

//END DATATABLE
var endOfInputTimer;
var stjson = {"bbox":[-178.21759836236586,18.92178634508703,-66.96927103600244,71.3495767194812],"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","coordinates":[[[[-159.33517471798157,21.948343324701092],[-159.43954519689842,21.868071670496747],[-159.57602128105867,21.884136154929344],[-159.80081423855142,22.036666621734504],[-159.71250591288543,22.149059266981972],[-159.57601257798004,22.213179613183627],[-159.39136687038012,22.22911987152966],[-159.29502560314327,22.124812489932854],[-159.33517471798157,21.948343324701092]]],[[[-157.67332988417294,21.29802716951978],[-157.82587169606273,21.24986365895678],[-157.89813454937863,21.330144275259947],[-158.0988330336982,21.290007956019398],[-158.23531870160576,21.474652575734478],[-158.2674318184349,21.587042527171896],[-158.11489404726018,21.579016630950427],[-157.9864281108934,21.699432841237588],[-157.91417976270856,21.63520847252475],[-157.80981513764817,21.43450517042949],[-157.76164292400654,21.458587573261482],[-157.67332988417294,21.29802716951978]]],[[[-156.7178726545323,21.13741977951431],[-156.76604818363245,21.065176818949563],[-156.88648407945462,21.049134092213528],[-157.07113191102013,21.105330958779675],[-157.28789752177835,21.08125057630522],[-157.30394879618086,21.13744842714812],[-157.16747146872368,21.193640475938597],[-156.7178726545323,21.13741977951431]]],[[[-157.03905065367525,20.928706951274044],[-156.91058585699736,20.928718607182915],[-156.80620532809687,20.84041862196725],[-156.88648718769699,20.736049386347357],[-156.96676557642644,20.7280207445118],[-157.03905065367525,20.928706951274044]]],[[[-156.19604543671127,20.63164943093208],[-156.39673495893206,20.5674269789687],[-156.49307472385175,20.792204291641564],[-156.637586598805,20.80826090186017],[-156.6937826365065,20.912624024603407],[-156.59743960793233,21.041064680598936],[-156.47702205074015,20.89656513500707],[-156.26026338172323,20.928671258290873],[-156.01139247654586,20.800225318283324],[-156.04351155083953,20.655732610824664],[-156.19604543671127,20.63164943093208]]],[[[-155.6661923226688,18.92178634508703],[-155.8588614917003,19.010100887237776],[-155.90703101153187,19.13051331583006],[-155.87492706401773,19.371358583806163],[-155.9471783132288,19.483750192972845],[-156.0435246572615,19.780783261808196],[-155.82676174031334,20.005562905662835],[-155.89097885646066,20.174149050213888],[-155.85885796902562,20.270479542210534],[-155.7384420695627,20.206256779422915],[-155.20055021189694,19.997528824403137],[-155.09618501699214,19.87711463447351],[-155.0721059814227,19.724585514573377],[-154.79109600559244,19.539960424981167],[-154.81518747413133,19.459676441415436],[-155.0158817105197,19.331211541129456],[-155.30489903672532,19.234878407126796],[-155.52167873818223,19.122484570386423],[-155.5377298053686,19.04221063680434],[-155.6661923226688,18.92178634508703]]]]},{"type":"MultiPolygon","coordinates":[[[[-117.03204952594353,48.99993130232423],[-117.03886843985023,48.046185988970734],[-117.04179474642979,47.3614417498501],[-117.03855854808634,46.427980567157284],[-116.92942629366874,46.16548328285924],[-116.91913241660085,45.99517548286163],[-118.98213281222488,45.99905835102935],[-119.14025060370322,45.92570864896612],[-119.58929428580802,45.913314946963794],[-119.67844567041178,45.85253901774398],[-119.9943201792136,45.811140337670494],[-120.20744536470863,45.71978406954033],[-120.44338375406954,45.689279727155835],[-120.57008244743506,45.74091794185985],[-121.17431600851339,45.600516147591264],[-121.31997772592592,45.69664284249678],[-121.52905463295534,45.71956768406761],[-121.81104101132085,45.700683091336295],[-122.24492227273171,45.548112839028846],[-122.4371542156704,45.5647789237714],[-122.76054129446695,45.64939740312063],[-122.80774176793686,45.9438901054702],[-122.89975729427287,46.07932969440945],[-123.1761963924877,46.18358646345973],[-123.30471708572415,46.14473757820721],[-123.47077301738115,46.27502380491162],[-123.72545892598501,46.28542382845632],[-123.88577092935763,46.24043839210453],[-124.01300206464046,46.38368003201086],[-123.8414513303247,46.40434305741595],[-123.95771187237247,46.61722538557412],[-123.84096659992771,46.71828807296501],[-124.09104930519553,46.72902275060445],[-124.10473805637967,46.87414534337859],[-123.99586477035521,46.97638569199793],[-124.11236153882282,47.04267502152666],[-124.23142535285652,47.27507053263065],[-124.31942694680504,47.349238220476536],[-124.37360573521099,47.63876353709284],[-124.48403495555985,47.808255060841084],[-124.60668516324358,47.87373510766577],[-124.73276977152562,48.149989058243655],[-124.71717571957514,48.377557624365274],[-124.56354721435014,48.357278829520666],[-123.9912157722483,48.159161636878],[-123.39685720077499,48.11103055564368],[-123.12322204799858,48.14873348373989],[-122.92159456183983,48.094179064244],[-122.84111113272226,48.13313642715511],[-122.661560715029,47.917157253519555],[-122.74586997606684,47.80898808799908],[-122.85880386991832,47.82732837568807],[-122.91696965261124,47.61460674366022],[-122.75294272976677,47.66068887152683],[-122.72306226342917,47.756899488976224],[-122.5318882625838,47.909461038205045],[-122.47358799660451,47.754980408335385],[-122.62150971704139,47.69696858724765],[-122.50446123555382,47.50721660728476],[-122.58825406212256,47.3339297123914],[-122.69974479904346,47.292085258558586],[-122.80218417878231,47.360740789392516],[-123.11543636710798,47.2079808824967],[-123.08119985450648,47.09005841505983],[-122.92314982271172,47.04796379952059],[-122.79004882352464,47.12585977228051],[-122.72818671901001,47.08244114910141],[-122.53076359688768,47.287456153202825],[-122.3253763289589,47.34432341584329],[-122.39263372057255,47.51024242942407],[-122.39449229409533,47.77417608432351],[-122.21699196945862,48.00743957210821],[-122.36833301551837,48.12814174069305],[-122.37832000545666,48.28972107808639],[-122.69941382303551,48.49432822898533],[-122.42954503114214,48.599397337177976],[-122.51685348704305,48.757921324129526],[-122.69740403352162,48.80301503092373],[-122.76511895841155,48.999746258295374],[-120.85705947154754,48.99983064707561],[-118.84360280150915,48.99989845856322],[-117.03204952594353,48.99993130232423]]],[[[-122.73318751834871,48.27664718904629],[-122.66561256797334,48.396777751860014],[-122.52575000195125,48.32104387248991],[-122.61092532292035,48.206321340568884],[-122.73318751834871,48.27664718904629]]]]},{"type":"Polygon","coordinates":[[[-116.06353130646863,48.99995046981882],[-114.06346349403009,48.999977511527405],[-112.1883874318577,48.999991913050366],[-110.75079731157214,49.00000538210062],[-109.50073703697794,49.00000501947234],[-108.25067489743832,49.000009630031855],[-107.1881208458935,49.000017141617576],[-106.12557964175045,49.000021182332645],[-105.06303450050041,49.00002133774477],[-104.06299108823991,49.00002672536486],[-104.04842519106006,48.000081274542936],[-104.04743749524421,46.64294748986229],[-104.04890634697833,45.942993688371836],[-104.04307227966532,44.99780552166421],[-104.05984238691906,44.997336280675015],[-105.08500309130733,44.99981707251544],[-106.25923173230902,44.99616250474951],[-107.89437438120743,44.999773712534434],[-108.62525623032091,44.99759317690657],[-110.42964951418419,44.99228512780998],[-111.05342863573298,44.99569549133402],[-111.05156063387503,44.4733232432141],[-111.12891862168544,44.50075695296517],[-111.31922174482388,44.72786404870351],[-111.48080398324342,44.69141596985452],[-111.49024096969504,44.528697306221915],[-111.87250235503184,44.55626586188763],[-112.09989701499309,44.518231750567324],[-112.23039853928539,44.55949133679492],[-112.36758366533337,44.4492705240967],[-112.71432587005228,44.496935472584184],[-112.88730758734933,44.39285203984985],[-113.00665875838976,44.45261571813913],[-113.13827391411779,44.76143923093759],[-113.34063106017199,44.77900017865733],[-113.49619092359518,44.93067038758364],[-113.45543539067127,45.043348939324744],[-113.73908074159563,45.32153077723017],[-113.80375451035056,45.583729514848955],[-114.00947218444286,45.68633228452818],[-114.13204784611384,45.550382684820704],[-114.32643452626877,45.457424687595264],[-114.52739213439361,45.558192920826],[-114.49756088189346,45.694401488926616],[-114.56354239181988,45.76239874583145],[-114.40752499512041,45.846453130995286],[-114.48445539238932,45.98980666762678],[-114.33468520021734,46.6542270423885],[-114.6108260107731,46.62904805164976],[-114.6738872233885,46.73472166117857],[-114.90232495768376,46.799433505902485],[-114.92412523716655,46.907165445330136],[-115.05563839074094,46.97335810852128],[-115.32522785525367,47.2451499181625],[-115.50193013866289,47.28164441343081],[-115.74282938644808,47.533691527873984],[-115.73366530367622,47.69555449238322],[-116.05349246068687,47.97619178995379],[-116.06353130646863,48.99995046981882]]]},{"type":"MultiPolygon","coordinates":[[[[-70.81866814760242,43.1218710665584],[-70.81320738019758,43.235222708183876],[-70.96969961272251,43.36637996800734],[-71.02872611953063,44.66853811454745],[-71.0875092509615,45.301469196722906],[-70.79696691744303,45.42517216609602],[-70.55227012274307,45.66066416004911],[-70.39638311681084,45.72204598931415],[-70.41621391032243,45.79030900094128],[-70.25396412505073,45.89900485813068],[-70.30484962706177,46.06665832275576],[-70.19105847996573,46.334839753476686],[-70.04660752656285,46.42611551812957],[-69.98497755594892,46.69136566908315],[-69.23029605045068,47.45333450061265],[-69.04697642265221,47.42203066648756],[-69.03671450867664,47.25736163257429],[-68.89487199226735,47.182256498830796],[-68.5146730293485,47.29696431840462],[-68.230806786,47.352148208783674],[-67.7910107465827,47.06100360150273],[-67.78028958979755,45.94706274025728],[-67.80343278539459,45.67811362547597],[-67.61514033243871,45.60519892193189],[-67.43930074169819,45.592561430119986],[-67.50410666255773,45.48581599501528],[-67.4185550888502,45.3758523375688],[-67.47795007779082,45.2802804121216],[-67.34560567659969,45.12225224163147],[-67.16590564884054,45.15626439093819],[-67.06535861885817,44.959295642045745],[-67.14670665739389,44.90458119987204],[-66.96927103600244,44.82865512751564],[-67.20036460798737,44.65378121587422],[-67.38851045551165,44.691400221426534],[-67.61883826018565,44.54023960883613],[-67.81121893252156,44.55400984777431],[-67.90004177590724,44.4523993326664],[-68.24561424541572,44.49064801631805],[-68.55218619924827,44.39904925347929],[-68.55942679803594,44.25988723348245],[-68.74030987464366,44.34633014749248],[-68.81167776137428,44.4945934637654],[-68.95917945465945,44.43033184794821],[-69.07445841376803,44.069066018145634],[-69.21914072401103,43.946787556248886],[-69.39448843539711,44.0251280594712],[-69.48323305468324,43.88716007077929],[-69.58932653595167,43.84486279783778],[-69.7485283787592,43.893375415822526],[-69.79152801086737,43.75608497216237],[-70.15662853108098,43.78981048971889],[-70.23579784713021,43.685796422593356],[-70.22223922769312,43.577240436310426],[-70.34161060230893,43.5349087136827],[-70.365925605278,43.43030371787934],[-70.53894109880875,43.335718193146995],[-70.66567211789487,43.09105056412123],[-70.81866814760242,43.1218710665584]]],[[[-68.38792097782238,44.37725306651561],[-68.2387092331955,44.43756332922496],[-68.1647688096706,44.334495721899884],[-68.40289032486133,44.27080146392258],[-68.38792097782238,44.37725306651561]]]]},{"type":"Polygon","coordinates":[[[-104.04890634697833,45.942993688371836],[-104.04743749524421,46.64294748986229],[-104.04842519106006,48.000081274542936],[-104.06299108823991,49.00002672536486],[-102.93795882673946,49.00002620732447],[-101.50043745041422,49.00002009444782],[-100.18790829059148,49.00000222205421],[-99.00040341397167,49.00000652178949],[-97.22943642753313,48.99998776872721],[-97.0971692661648,48.67452889098158],[-97.16794316777927,48.562263269238805],[-97.11963315539275,48.437102067959664],[-97.13975389611305,48.22175516262541],[-96.98389284400459,47.809661540511726],[-96.85221687033427,47.60115157688988],[-96.8352964277581,47.0102313431219],[-96.75691111404167,46.92278042611257],[-96.7902458219247,46.629773256397804],[-96.74031600083315,46.489432642699796],[-96.60207422779283,46.33632419822668],[-96.5519309740588,46.09552892114862],[-96.56692150894989,45.934110435297725],[-97.97872181706775,45.93082217389464],[-99.00683281330585,45.93955555788266],[-100.51440677180048,45.94038799699233],[-102.00277505612738,45.942505383496126],[-102.99482292933352,45.94111563653023],[-104.04890634697833,45.942993688371836]]]},{"type":"Polygon","coordinates":[[[-104.05619885341353,43.003062335614885],[-104.06103615920378,44.18182528058017],[-104.05984238691906,44.997336280675015],[-104.04307227966532,44.99780552166421],[-104.04890634697833,45.942993688371836],[-102.99482292933352,45.94111563653023],[-102.00277505612738,45.942505383496126],[-100.51440677180048,45.94038799699233],[-99.00683281330585,45.93955555788266],[-97.97872181706775,45.93082217389464],[-96.56692150894989,45.934110435297725],[-96.65739177259361,45.738970576213475],[-96.8327958467746,45.65068690927023],[-96.84308718544457,45.58409027817957],[-96.69316919634808,45.41063812840042],[-96.5325489071368,45.37513215781259],[-96.45449658978585,45.275195431218805],[-96.45510616791788,44.53834316656052],[-96.4604547277733,43.49971848871521],[-96.57913084037587,43.29007401662976],[-96.4731145471262,43.20908213086516],[-96.46209396299312,43.07558218877041],[-96.55621117920897,42.84666065655088],[-96.63298056952333,42.776835597722695],[-96.43939472801402,42.48924086224398],[-96.60546728876768,42.50723629044245],[-96.7226587494041,42.66859193799351],[-97.1304692653414,42.773923381841854],[-97.38930602440898,42.867433143891304],[-97.81864298367663,42.866587494751585],[-97.96355841209707,42.7736900046442],[-98.45744403336442,42.93716075932132],[-98.49765137594304,42.991778794177634],[-100.19814212677768,42.991095032661136],[-101.23173720223836,42.98684295710438],[-102.08670091546938,42.98988701426558],[-103.50146384479845,42.99861884413241],[-104.05619885341353,43.003062335614885]]]},{"type":"Polygon","coordinates":[[[-104.05170552644512,41.00321132308138],[-104.93449293023608,40.99428916517366],[-106.86543876826961,40.998457369990575],[-107.91867135637075,41.00337512745407],[-109.04831469542124,40.99843338472032],[-110.00216548179903,40.997599495097546],[-111.05102249351339,40.99658361788424],[-111.0486974246155,41.99620332490622],[-111.049215672226,43.01988310721919],[-111.05156063387503,44.4733232432141],[-111.05342863573298,44.99569549133402],[-110.42964951418419,44.99228512780998],[-108.62525623032091,44.99759317690657],[-107.89437438120743,44.999773712534434],[-106.25923173230902,44.99616250474951],[-105.08500309130733,44.99981707251544],[-104.05984238691906,44.997336280675015],[-104.06103615920378,44.18182528058017],[-104.05619885341353,43.003062335614885],[-104.05351343561733,41.99981536155576],[-104.05170552644512,41.00321132308138]]]},{"type":"MultiPolygon","coordinates":[[[[-87.79738197948976,42.48915284718098],[-88.93918704205399,42.49087978663956],[-90.63845609822665,42.509363675125854],[-90.69479112616598,42.6379287644241],[-91.0661686900338,42.74491384501523],[-91.13912172856708,42.92589369156861],[-91.16135405373876,43.14757592010143],[-91.06905231008487,43.25789821691292],[-91.19824360661181,43.37051299788148],[-91.2235667679923,43.500808652921066],[-91.25110491468686,43.78807577965439],[-91.37335731915176,43.94719110971607],[-91.60178624676031,44.04082224862992],[-91.8487439251533,44.19118725478269],[-91.97238597297604,44.36448720429398],[-92.20613745481221,44.43839442142959],[-92.34087250881515,44.5528353983963],[-92.50921486355664,44.57515915769757],[-92.80558468527511,44.74616056197917],[-92.76102808276175,44.83537105499194],[-92.74659335340976,45.29760311306397],[-92.64497506769594,45.43945210497819],[-92.72815468984989,45.5472423239502],[-92.87683119514134,45.578836571520355],[-92.86001974826414,45.710562536088716],[-92.66620788573078,45.91570311318172],[-92.28937038332273,46.0732311156711],[-92.28727154266507,46.65878600507487],[-92.09596984486248,46.74262747563664],[-91.92146094448292,46.68013424250957],[-91.55577281104999,46.75686001382272],[-90.86173042030342,46.9524795265081],[-90.77744561077219,46.88312256898023],[-90.92624380375226,46.585502923006366],[-90.73071391205511,46.645696212194665],[-90.40819983493111,46.56861066182765],[-90.21152579921902,46.50629501294776],[-90.11165937070675,46.34042899489933],[-89.09980613977237,46.14564280199228],[-88.80439717937733,46.026804646354364],[-88.54835794204728,46.019300209593844],[-88.18019393815767,45.953516642902116],[-88.06542105271032,45.87364211846407],[-88.12994951113464,45.8194019422714],[-87.87362882245834,45.750699373369656],[-87.77747373893922,45.6841018098063],[-87.78938488631422,45.49906762371468],[-87.86209605178738,45.370165186511635],[-87.64536204149323,45.34816919136786],[-87.73619995840481,45.19907234810044],[-87.6728141416783,45.14067261836543],[-87.5812758859576,45.094639911552434],[-87.62033551004254,44.99199777080324],[-87.83999266686985,44.92732317318368],[-87.98579161318284,44.72047446149841],[-88.04041762586122,44.57144915960945],[-87.92640864277936,44.539139601862786],[-87.76422677260338,44.64404842835743],[-87.6144638329969,44.833047436607146],[-87.43374689194366,44.89109660840731],[-87.31446513831607,44.79471876751862],[-87.47352840531812,44.53394645412566],[-87.53748883245004,44.32785102497781],[-87.51732188252656,44.17575446880696],[-87.64437077119865,44.097830470061695],[-87.72612184516116,43.89390392063284],[-87.70272988656674,43.673176181526586],[-87.87533224288302,43.358592525779386],[-87.88983411027012,43.19721683006506],[-87.81984908056816,42.84156303546247],[-87.75680361638072,42.77754619373161],[-87.79738197948976,42.48915284718098]]],[[[-87.03452439785973,45.29040571884518],[-86.96771226196503,45.24027748828259],[-87.31112362236044,44.79877372870534],[-87.4054197697285,44.91119989116632],[-87.03452439785973,45.29040571884518]]]]},{"type":"Polygon","coordinates":[[[-116.91913241660085,45.99517548286163],[-116.92942629366874,46.16548328285924],[-117.03855854808634,46.427980567157284],[-117.04179474642979,47.3614417498501],[-117.03886843985023,48.046185988970734],[-117.03204952594353,48.99993130232423],[-116.06353130646863,48.99995046981882],[-116.05349246068687,47.97619178995379],[-115.73366530367622,47.69555449238322],[-115.74282938644808,47.533691527873984],[-115.50193013866289,47.28164441343081],[-115.32522785525367,47.2451499181625],[-115.05563839074094,46.97335810852128],[-114.92412523716655,46.907165445330136],[-114.90232495768376,46.799433505902485],[-114.6738872233885,46.73472166117857],[-114.6108260107731,46.62904805164976],[-114.33468520021734,46.6542270423885],[-114.48445539238932,45.98980666762678],[-114.40752499512041,45.846453130995286],[-114.56354239181988,45.76239874583145],[-114.49756088189346,45.694401488926616],[-114.52739213439361,45.558192920826],[-114.32643452626877,45.457424687595264],[-114.13204784611384,45.550382684820704],[-114.00947218444286,45.68633228452818],[-113.80375451035056,45.583729514848955],[-113.73908074159563,45.32153077723017],[-113.45543539067127,45.043348939324744],[-113.49619092359518,44.93067038758364],[-113.34063106017199,44.77900017865733],[-113.13827391411779,44.76143923093759],[-113.00665875838976,44.45261571813913],[-112.88730758734933,44.39285203984985],[-112.71432587005228,44.496935472584184],[-112.36758366533337,44.4492705240967],[-112.23039853928539,44.55949133679492],[-112.09989701499309,44.518231750567324],[-111.87250235503184,44.55626586188763],[-111.49024096969504,44.528697306221915],[-111.48080398324342,44.69141596985452],[-111.31922174482388,44.72786404870351],[-111.12891862168544,44.50075695296517],[-111.05156063387503,44.4733232432141],[-111.049215672226,43.01988310721919],[-111.0486974246155,41.99620332490622],[-112.98957544391361,42.00114677717326],[-114.03907264994731,41.99539088215577],[-115.02486290601404,41.99650643034094],[-115.94754465237733,41.99459947184533],[-117.01886436182674,41.99479420322956],[-117.02629523685127,43.679031229475555],[-117.03711730790525,43.80014197651941],[-116.90225414251277,44.146313818764156],[-117.21357186439788,44.284719707001415],[-117.224409891096,44.47298703499817],[-117.14516064141392,44.53465559962147],[-117.03957224952998,44.74911572340869],[-116.83539616004317,44.9201440657908],[-116.85451319749944,45.016945301093784],[-116.73658529063842,45.1373070653355],[-116.67226549888494,45.335410270887515],[-116.47855123516187,45.56605848354542],[-116.56063188642327,45.74742458101683],[-116.77370713282428,45.81976363807472],[-116.91913241660085,45.99517548286163]]]},{"type":"Polygon","coordinates":[[[-73.25805980563882,42.74605866248269],[-73.27600529474327,42.940294126646506],[-73.23839136598681,43.5128328367101],[-73.37098939975502,43.71428113269647],[-73.43600072363091,44.04567918815112],[-73.3053256558065,44.26014226476859],[-73.29331975884338,44.43285356497979],[-73.38182509527137,44.61980771238092],[-73.32678630800677,44.79929358224106],[-73.38230676923003,44.847933638162814],[-73.34472350846491,45.00613877125164],[-72.54723119658225,45.00537010291452],[-71.50537228894697,45.01335170668227],[-71.50636495795061,44.89967116121043],[-71.63113286296237,44.74171075040389],[-71.53679081721538,44.57893126882898],[-71.67688437744931,44.42134275922154],[-72.05956599715401,44.261494091177624],[-72.03472834323111,44.08337403481717],[-72.21912290484784,43.750692534285534],[-72.37349837251745,43.572374638298484],[-72.45715904698157,42.9996036907261],[-72.53891695907728,42.807733806219005],[-72.45577002527223,42.725852548705404],[-73.25805980563882,42.74605866248269]]]},{"type":"Polygon","coordinates":[[[-96.4604547277733,43.49971848871521],[-96.45510616791788,44.53834316656052],[-96.45449658978585,45.275195431218805],[-96.5325489071368,45.37513215781259],[-96.69316919634808,45.41063812840042],[-96.84308718544457,45.58409027817957],[-96.8327958467746,45.65068690927023],[-96.65739177259361,45.738970576213475],[-96.56692150894989,45.934110435297725],[-96.5519309740588,46.09552892114862],[-96.60207422779283,46.33632419822668],[-96.74031600083315,46.489432642699796],[-96.7902458219247,46.629773256397804],[-96.75691111404167,46.92278042611257],[-96.8352964277581,47.0102313431219],[-96.85221687033427,47.60115157688988],[-96.98389284400459,47.809661540511726],[-97.13975389611305,48.22175516262541],[-97.11963315539275,48.437102067959664],[-97.16794316777927,48.562263269238805],[-97.0971692661648,48.67452889098158],[-97.22943642753313,48.99998776872721],[-96.40691520121398,48.99998207028287],[-95.15774989320504,48.9999959019614],[-95.15186733731112,49.371730136640736],[-94.83203924782775,49.33080592976444],[-94.68124996659202,48.87716132370133],[-94.69443202246646,48.777615510389126],[-94.57031275583246,48.71367627110933],[-94.29233689078782,48.70771113957655],[-94.23082736456557,48.65198755471468],[-93.8439037710918,48.624736972243],[-93.7811059820169,48.51159016378945],[-93.51413909700051,48.53427095653051],[-93.30423674440677,48.63716299996594],[-92.94692625662306,48.62835548439749],[-92.4975292191653,48.44007277060102],[-92.3701160444879,48.22077907091439],[-92.27613087676858,48.35231968062966],[-92.03518365844286,48.35550878910127],[-91.97953394614122,48.250398134068995],[-91.71193784926186,48.196775099398096],[-91.57156190520895,48.04357154270857],[-91.23944667463238,48.0812981452508],[-90.86449478745571,48.25419811577362],[-90.74336559817381,48.08844373543016],[-90.14527003870784,48.11277086054444],[-89.90038913245172,47.99250514099183],[-89.74930995581131,48.0264846537537],[-89.63637362716999,47.959390652080444],[-89.99967779051218,47.8245648374004],[-90.50963343924435,47.709937987540215],[-91.02147563568059,47.46105884552057],[-91.46865716978387,47.12493553641296],[-91.80096884127798,46.927086636890536],[-92.08849203537824,46.791897261461756],[-92.28727154266507,46.65878600507487],[-92.28937038332273,46.0732311156711],[-92.66620788573078,45.91570311318172],[-92.86001974826414,45.710562536088716],[-92.87683119514134,45.578836571520355],[-92.72815468984989,45.5472423239502],[-92.64497506769594,45.43945210497819],[-92.74659335340976,45.29760311306397],[-92.76102808276175,44.83537105499194],[-92.80558468527511,44.74616056197917],[-92.50921486355664,44.57515915769757],[-92.34087250881515,44.5528353983963],[-92.20613745481221,44.43839442142959],[-91.97238597297604,44.36448720429398],[-91.8487439251533,44.19118725478269],[-91.60178624676031,44.04082224862992],[-91.37335731915176,43.94719110971607],[-91.25110491468686,43.78807577965439],[-91.2235667679923,43.500808652921066],[-92.45316910937352,43.49946190330789],[-93.50083022483754,43.500488503957364],[-94.45523826726752,43.49810209907679],[-95.46477533959877,43.49954100807611],[-96.4604547277733,43.49971848871521]]]},{"type":"Polygon","coordinates":[[[-124.20644446076457,41.99764793234988],[-124.35224677434013,42.098677257939364],[-124.43781881064322,42.42960876621487],[-124.4010786606199,42.62269925749911],[-124.55961689368229,42.83245738764708],[-124.48534658203428,42.95545395713846],[-124.38677240528571,43.26158889209433],[-124.27399397535657,43.459105416899746],[-124.15832555347953,43.85711823485885],[-124.11831931418199,44.26951501421131],[-124.05440488903709,44.6621389687723],[-124.07556808244291,44.81473854216607],[-123.95660684040732,45.2929657190619],[-123.98055988855283,45.485084521978465],[-123.93607591530278,45.702835238350545],[-123.9965056899311,45.941921966404024],[-123.92118722715321,46.01232334517092],[-123.97734068193432,46.20270598750989],[-123.67024643977621,46.17449848082178],[-123.51702931042834,46.236091566959644],[-123.30471708572415,46.14473757820721],[-123.1761963924877,46.18358646345973],[-122.89975729427287,46.07932969440945],[-122.80774176793686,45.9438901054702],[-122.76054129446695,45.64939740312063],[-122.4371542156704,45.5647789237714],[-122.24492227273171,45.548112839028846],[-121.81104101132085,45.700683091336295],[-121.52905463295534,45.71956768406761],[-121.31997772592592,45.69664284249678],[-121.17431600851339,45.600516147591264],[-120.57008244743506,45.74091794185985],[-120.44338375406954,45.689279727155835],[-120.20744536470863,45.71978406954033],[-119.9943201792136,45.811140337670494],[-119.67844567041178,45.85253901774398],[-119.58929428580802,45.913314946963794],[-119.14025060370322,45.92570864896612],[-118.98213281222488,45.99905835102935],[-116.91913241660085,45.99517548286163],[-116.77370713282428,45.81976363807472],[-116.56063188642327,45.74742458101683],[-116.47855123516187,45.56605848354542],[-116.67226549888494,45.335410270887515],[-116.73658529063842,45.1373070653355],[-116.85451319749944,45.016945301093784],[-116.83539616004317,44.9201440657908],[-117.03957224952998,44.74911572340869],[-117.14516064141392,44.53465559962147],[-117.224409891096,44.47298703499817],[-117.21357186439788,44.284719707001415],[-116.90225414251277,44.146313818764156],[-117.03711730790525,43.80014197651941],[-117.02629523685127,43.679031229475555],[-117.01886436182674,41.99479420322956],[-118.18531685388108,41.996637080128394],[-119.31094211622093,41.989135388981964],[-119.99345935149032,41.98920496180692],[-120.87190852960694,41.987672183888144],[-122.28470508120716,42.00076456697032],[-123.81914642769377,41.9929487879328],[-124.20644446076457,41.99764793234988]]]},{"type":"Polygon","coordinates":[[[-72.45577002527223,42.725852548705404],[-72.53891695907728,42.807733806219005],[-72.45715904698157,42.9996036907261],[-72.37349837251745,43.572374638298484],[-72.21912290484784,43.750692534285534],[-72.03472834323111,44.08337403481717],[-72.05956599715401,44.261494091177624],[-71.67688437744931,44.42134275922154],[-71.53679081721538,44.57893126882898],[-71.63113286296237,44.74171075040389],[-71.50636495795061,44.89967116121043],[-71.50537228894697,45.01335170668227],[-71.38637799593421,45.23493037894026],[-71.29723572884137,45.29349391304797],[-71.15308938319038,45.23796925569752],[-71.0875092509615,45.301469196722906],[-71.02872611953063,44.66853811454745],[-70.96969961272251,43.36637996800734],[-70.81320738019758,43.235222708183876],[-70.81866814760242,43.1218710665584],[-70.73413887480909,43.05876291948326],[-70.81388072910215,42.867064972583044],[-70.89811166243237,42.88687747926871],[-71.06556474903292,42.80431971280413],[-71.18106081887078,42.80731714632984],[-71.28719444826976,42.69860346855087],[-71.90094192479827,42.70537860804424],[-72.45577002527223,42.725852548705404]]]},{"type":"Polygon","coordinates":[[[-91.44874716789599,40.371946621442405],[-91.74171175469033,40.609784354105116],[-92.71781543244344,40.58966718786354],[-94.23839179040375,40.570966136843936],[-95.76747960384715,40.589047974180176],[-95.87661610619598,40.730436272771705],[-95.83439653931363,40.870300807347306],[-95.8582741089737,41.10918700196413],[-95.9428951785249,41.3400771394862],[-95.93506577502501,41.46238139979458],[-96.11130762413174,41.59900631696012],[-96.07641713733642,41.79146909869854],[-96.35216573950962,42.16818543145834],[-96.33265784057582,42.260307156075186],[-96.4241751674646,42.3492788842702],[-96.43939472801402,42.48924086224398],[-96.63298056952333,42.776835597722695],[-96.55621117920897,42.84666065655088],[-96.46209396299312,43.07558218877041],[-96.4731145471262,43.20908213086516],[-96.57913084037587,43.29007401662976],[-96.4604547277733,43.49971848871521],[-95.46477533959877,43.49954100807611],[-94.45523826726752,43.49810209907679],[-93.50083022483754,43.500488503957364],[-92.45316910937352,43.49946190330789],[-91.2235667679923,43.500808652921066],[-91.19824360661181,43.37051299788148],[-91.06905231008487,43.25789821691292],[-91.16135405373876,43.14757592010143],[-91.13912172856708,42.92589369156861],[-91.0661686900338,42.74491384501523],[-90.69479112616598,42.6379287644241],[-90.63845609822665,42.509363675125854],[-90.44172507807119,42.360083652775],[-90.36785826808632,42.21022668883696],[-90.16677674469916,42.1037669012057],[-90.14279675845313,41.98398953833284],[-90.19596567891435,41.80616699257086],[-90.30501587573347,41.756497072345155],[-90.34849428077409,41.58688241039517],[-90.65892972806358,41.46235067999919],[-91.05593552730012,41.40140732012392],[-91.10249647990322,41.267848166012094],[-90.95792989988433,41.10439326337104],[-90.96085092245187,40.95054158634415],[-91.08905027523171,40.83376751085345],[-91.162644388753,40.65635235205758],[-91.37576273611482,40.603480268742324],[-91.372908333542,40.40303256777763],[-91.44874716789599,40.371946621442405]]]},{"type":"Polygon","coordinates":[[[-71.79783163094471,42.00427480868238],[-71.80234070634111,42.0179769253087],[-73.045632472359,42.036310374864485],[-73.48423028434419,42.04742803976747],[-73.49884000774139,42.07746070637292],[-73.25805980563882,42.74605866248269],[-72.45577002527223,42.725852548705404],[-71.90094192479827,42.70537860804424],[-71.28719444826976,42.69860346855087],[-71.18106081887078,42.80731714632984],[-71.06556474903292,42.80431971280413],[-70.89811166243237,42.88687747926871],[-70.81388072910215,42.867064972583044],[-70.73969542788285,42.663523534383344],[-70.96062199089245,42.4323935441587],[-71.03416196919251,42.28562881513853],[-70.77459549842547,42.24863995392189],[-70.68603727007321,42.15316661156172],[-70.61870300126506,41.96818982434579],[-70.5403385127725,41.93095152667928],[-70.53770479540765,41.80576198859056],[-70.42351170076965,41.74362236983667],[-70.20525962490392,41.71257330797752],[-70.0192146901989,41.7815193558646],[-70.00044795165729,41.85635039443544],[-70.10049724842877,42.00219389222235],[-70.05047096821578,42.02629872620342],[-69.91777979078468,41.767653797493864],[-69.95442327447041,41.671495139496024],[-70.66488780473783,41.55612712924365],[-70.61976089155435,41.735636207313455],[-71.00118476098562,41.52012409889744],[-71.11713271745946,41.49306197952123],[-71.19880867556479,41.67850034072852],[-71.22897613628085,41.70769398911129],[-71.33979860109307,41.784425562476855],[-71.37864422269111,42.01371329745115],[-71.79783163094471,42.00427480868238]]]},{"type":"Polygon","coordinates":[[[-102.05153560824486,39.99891827005396],[-102.04773930462704,40.99807086005236],[-102.65227104975637,40.99812416640894],[-104.05170552644512,41.00321132308138],[-104.05351343561733,41.99981536155576],[-104.05619885341353,43.003062335614885],[-103.50146384479845,42.99861884413241],[-102.08670091546938,42.98988701426558],[-101.23173720223836,42.98684295710438],[-100.19814212677768,42.991095032661136],[-98.49765137594304,42.991778794177634],[-98.45744403336442,42.93716075932132],[-97.96355841209707,42.7736900046442],[-97.81864298367663,42.866587494751585],[-97.38930602440898,42.867433143891304],[-97.1304692653414,42.773923381841854],[-96.7226587494041,42.66859193799351],[-96.60546728876768,42.50723629044245],[-96.43939472801402,42.48924086224398],[-96.4241751674646,42.3492788842702],[-96.33265784057582,42.260307156075186],[-96.35216573950962,42.16818543145834],[-96.07641713733642,41.79146909869854],[-96.11130762413174,41.59900631696012],[-95.93506577502501,41.46238139979458],[-95.9428951785249,41.3400771394862],[-95.8582741089737,41.10918700196413],[-95.83439653931363,40.870300807347306],[-95.87661610619598,40.730436272771705],[-95.76747960384715,40.589047974180176],[-95.63418501296472,40.35880015494306],[-95.47682210994901,40.22685490387577],[-95.30869722856508,39.999407559206425],[-95.78070020192693,39.993489465741455],[-96.80142031585895,39.9944759700644],[-97.92958869029866,39.99845286256369],[-99.06474698377924,39.99833796120423],[-100.73504944867398,39.999172317063355],[-102.05153560824486,39.99891827005396]]]},{"type":"MultiPolygon","coordinates":[[[[-79.76323498046474,42.26732706965488],[-79.14223328068616,42.57461676845378],[-79.04375193677625,42.69924677111257],[-78.8591998390756,42.79274513627334],[-78.92559635116191,43.06662672086533],[-79.06111473404515,43.09060499757806],[-79.06223898530895,43.26821618285915],[-78.4646536956314,43.37199355732851],[-77.99200933645731,43.365571617776],[-77.74500741741464,43.33517005460574],[-77.5757115057193,43.24154767057456],[-77.37731586636468,43.2757129008178],[-76.91452748471316,43.27859600282847],[-76.73682947586198,43.342733185342944],[-76.45465572228584,43.500721000486344],[-76.22276473072189,43.5541537589204],[-76.18457038950761,43.633197346565915],[-76.23999180140747,43.8351272647069],[-76.12906593573254,43.932208034606674],[-76.20154253251515,44.06559810033379],[-76.36288098112512,44.098354778744806],[-75.8480298506664,44.39026271854681],[-75.75865752183445,44.51753353572383],[-75.32886235583801,44.81062918673794],[-74.96846963131605,44.94862514961115],[-74.73610763742559,44.99291620461837],[-74.02153893213398,44.99084735849952],[-73.34472350846491,45.00613877125164],[-73.38230676923003,44.847933638162814],[-73.32678630800677,44.79929358224106],[-73.38182509527137,44.61980771238092],[-73.29331975884338,44.43285356497979],[-73.3053256558065,44.26014226476859],[-73.43600072363091,44.04567918815112],[-73.37098939975502,43.71428113269647],[-73.23839136598681,43.5128328367101],[-73.27600529474327,42.940294126646506],[-73.25805980563882,42.74605866248269],[-73.49884000774139,42.07746070637292],[-73.48423028434419,42.04742803976747],[-73.55025966120303,41.29362072743467],[-73.47812077495351,41.21075488234757],[-73.72523764715969,41.100354206024434],[-73.65315144561826,40.99839245952917],[-73.7963459438487,40.83233409308231],[-73.91986184883541,40.80280480632804],[-74.00618343778508,40.7040019665494],[-73.89669751719028,40.99852979203771],[-74.21303867677932,41.12361162952844],[-74.70006243859127,41.35057310411193],[-74.75482661264283,41.43014638806066],[-74.97178799086606,41.48360261372458],[-75.06986536687647,41.60447796321324],[-75.07984303208765,41.814148337318414],[-75.25451547781972,41.86887334751616],[-75.34565707001047,41.99284497263777],[-76.96857370658219,42.002980950993475],[-77.74500793545504,41.997333171006275],[-78.91853825800516,41.99984680660771],[-79.76165967142958,42.003105746924476],[-79.76323498046474,42.26732706965488]]],[[[-73.75220895405477,40.59458722470477],[-73.76493513438218,40.63693345246354],[-74.02772169243642,40.639336486440776],[-73.89901776831249,40.79711724083856],[-73.43064781223616,40.92255662980946],[-73.21452312105384,40.90104173877991],[-73.02126965426154,40.96843309563952],[-72.63157242071243,40.981285211586794],[-72.47610912001873,40.9201483118202],[-72.29308244406327,41.024017431243394],[-72.07701116284561,41.000574290258015],[-72.52116418099953,40.81504159389492],[-73.75220895405477,40.59458722470477]]]]},{"type":"Polygon","coordinates":[[[-79.48097108785997,39.72027408109659],[-80.52426947433901,39.72120898859626],[-80.52199952493908,40.63720319609688],[-80.52059257903208,41.986872122303126],[-79.76323498046474,42.26732706965488],[-79.76165967142958,42.003105746924476],[-78.91853825800516,41.99984680660771],[-77.74500793545504,41.997333171006275],[-76.96857370658219,42.002980950993475],[-75.34565707001047,41.99284497263777],[-75.25451547781972,41.86887334751616],[-75.07984303208765,41.814148337318414],[-75.06986536687647,41.60447796321324],[-74.97178799086606,41.48360261372458],[-74.75482661264283,41.43014638806066],[-74.70006243859127,41.35057310411193],[-74.79166348080777,41.31196464140642],[-74.91476832074157,41.14110569823326],[-75.1355249146978,40.96293653164342],[-75.05461902363865,40.85567336696862],[-75.19364417736331,40.74800359238829],[-75.18228199739418,40.55679913076773],[-75.06367965374378,40.52100347199138],[-75.05745332624417,40.4201714679881],[-74.73882470748987,40.17772566240963],[-75.11096306548083,39.976690348225645],[-75.1429012400688,39.88160201348655],[-75.42046795680997,39.798983118255435],[-75.69477086365468,39.820457446722116],[-75.79109456932217,39.72386601777884],[-76.5698344405781,39.72026537801796],[-77.47579337677568,39.719623215145134],[-78.0959483395297,39.72546106415302],[-79.48097108785997,39.72027408109659]]]},{"type":"Polygon","coordinates":[[[-73.48423028434419,42.04742803976747],[-73.045632472359,42.036310374864485],[-71.80234070634111,42.0179769253087],[-71.79783163094471,42.00427480868238],[-71.80274343094368,41.41582904666202],[-71.86667842229224,41.322769668931414],[-72.52724488734428,41.2637025995604],[-72.90673434213903,41.27006320313022],[-73.1044185566201,41.161039426371204],[-73.65315144561826,40.99839245952917],[-73.72523764715969,41.100354206024434],[-73.47812077495351,41.21075488234757],[-73.55025966120303,41.29362072743467],[-73.48423028434419,42.04742803976747]]]},{"type":"MultiPolygon","coordinates":[[[[-71.79783163094471,42.00427480868238],[-71.37864422269111,42.01371329745115],[-71.33979860109307,41.784425562476855],[-71.22897613628085,41.70769398911129],[-71.4192468300906,41.652212225505494],[-71.42731852108292,41.486689357414264],[-71.48988806156008,41.392085338639845],[-71.86667842229224,41.322769668931414],[-71.80274343094368,41.41582904666202],[-71.79783163094471,42.00427480868238]]],[[[-71.19880867556479,41.67850034072852],[-71.11713271745946,41.49306197952123],[-71.19993717475982,41.4633184830639],[-71.19880867556479,41.67850034072852]]]]},{"type":"Polygon","coordinates":[[[-75.48928066109954,39.71485822779394],[-75.42046795680997,39.798983118255435],[-75.1429012400688,39.88160201348655],[-75.11096306548083,39.976690348225645],[-74.73882470748987,40.17772566240963],[-75.05745332624417,40.4201714679881],[-75.06367965374378,40.52100347199138],[-75.18228199739418,40.55679913076773],[-75.19364417736331,40.74800359238829],[-75.05461902363865,40.85567336696862],[-75.1355249146978,40.96293653164342],[-74.91476832074157,41.14110569823326],[-74.79166348080777,41.31196464140642],[-74.70006243859127,41.35057310411193],[-74.21303867677932,41.12361162952844],[-73.89669751719028,40.99852979203771],[-74.00618343778508,40.7040019665494],[-74.27891036214213,40.514303655571354],[-74.12188548048373,40.451458569408445],[-73.97844056152667,40.323615991048186],[-74.04979005782329,40.05685621858146],[-74.15922852591798,39.87860540882548],[-74.17142692669164,39.71827465239058],[-74.40111961384218,39.50262764625589],[-74.44750085823249,39.38107532157989],[-74.65823414761877,39.287251419835314],[-74.62458700957391,39.25082851774949],[-74.80229180475426,39.026373581614024],[-74.91665435040525,39.170638558515336],[-75.11995811167203,39.18469180292094],[-75.55276304055558,39.490514307714975],[-75.57023421187496,39.61773497858183],[-75.48928066109954,39.71485822779394]]]},{"type":"Polygon","coordinates":[[[-88.03560736177955,37.80572789963078],[-88.0347614018156,38.054130755311874],[-87.93231948367881,38.17117700922576],[-87.9860398581398,38.234860440158826],[-87.6514157061294,38.51541692342788],[-87.62521519153705,38.64285802048252],[-87.50790945118965,38.79560492456443],[-87.53349240982789,38.9637465386531],[-87.67035241372439,39.14671907938736],[-87.58861693277774,39.20850513557211],[-87.6252620223887,39.3074413707523],[-87.54023771019455,39.35056237972485],[-87.53269612993775,40.74544789190684],[-87.5299063270021,41.7236260624191],[-87.39474668709194,41.634191206111545],[-87.2338545302817,41.6261887253159],[-86.83482961680417,41.765504758721974],[-85.65945885214508,41.76262751056776],[-84.78847779615735,41.76095947230202],[-84.7903774502834,41.69749475802344],[-84.79455627492841,40.353050735430486],[-84.81148060280753,39.10258550866003],[-84.88999610007505,39.050648591864636],[-84.80322402319847,38.897190884557645],[-84.81878020639613,38.793409987413604],[-84.97561118553493,38.780641016949616],[-85.16093319486964,38.69517652583238],[-85.27139391207449,38.74437673883254],[-85.45367927222566,38.694674544690265],[-85.41746172135215,38.56147563586866],[-85.61264027805387,38.44667037289666],[-85.68138900435474,38.30095369139829],[-85.83990770729426,38.27629149775695],[-85.91475112703053,38.06487486128649],[-86.05271569665584,37.96678448246219],[-86.29144005545346,38.07848953269425],[-86.2976743089711,38.150304073852865],[-86.51909124901799,38.047047899824264],[-86.51690102603474,37.94224205976002],[-86.75382560889435,37.89835937599567],[-86.86327267645959,37.98692024635392],[-87.03648000034836,37.90800544355044],[-87.13187941834427,37.78973635528571],[-87.38755063977817,37.93496923885981],[-87.60432573067558,37.97115731323487],[-87.67972096703991,37.897049355446455],[-87.82364719732736,37.878255005351825],[-87.95873804147314,37.77622425587603],[-88.03560736177955,37.80572789963078]]]},{"type":"Polygon","coordinates":[[[-119.99345935149032,41.98920496180692],[-119.31094211622093,41.989135388981964],[-118.18531685388108,41.996637080128394],[-117.01886436182674,41.99479420322956],[-115.94754465237733,41.99459947184533],[-115.02486290601404,41.99650643034094],[-114.03907264994731,41.99539088215577],[-114.03815126330193,40.997686836708034],[-114.03810821414515,40.111046662896285],[-114.04426750721774,38.67899589674337],[-114.04726058920413,37.59847848370049],[-114.04393938043196,36.99653792481963],[-114.03739207510402,36.216022884544394],[-114.12902306005532,36.04173047324562],[-114.23347259193633,36.01833105486952],[-114.344233927982,36.137480241960205],[-114.53057357586738,36.155090196301245],[-114.71276169983652,36.105181045021425],[-114.73621250781974,35.987648351177256],[-114.66160013409934,35.88047356419372],[-114.67221514440769,35.51575416629822],[-114.55958306088996,35.22018285204358],[-114.62106860184196,34.998914434177756],[-115.88576931962875,36.00122598269681],[-117.16042376916052,36.95959413311729],[-117.83868644227925,37.45729823013134],[-118.41741977577033,37.88667673623861],[-119.15245040318595,38.411800970345396],[-119.99525467228096,38.99410614055142],[-119.99616533549018,39.72061080735291],[-119.99632468471547,41.17756626185575],[-119.99345935149032,41.98920496180692]]]},{"type":"Polygon","coordinates":[[[-114.03907264994731,41.99539088215577],[-112.98957544391361,42.00114677717326],[-111.0486974246155,41.99620332490622],[-111.05102249351339,40.99658361788424],[-110.00216548179903,40.997599495097546],[-109.04831469542124,40.99843338472032],[-109.05126317412969,40.21051135108274],[-109.05141682491065,39.36096608135635],[-109.05586114525775,38.244920162968484],[-109.04346402418882,38.15293369869859],[-109.04848010571915,36.996640911250026],[-110.45223581635732,36.991746310192156],[-110.48408898051656,37.003926009707584],[-112.23725786034284,36.99549215667557],[-112.89998346595446,36.99622689336687],[-114.04393938043196,36.99653792481963],[-114.04726058920413,37.59847848370049],[-114.04426750721774,38.67899589674337],[-114.03810821414515,40.111046662896285],[-114.03815126330193,40.997686836708034],[-114.03907264994731,41.99539088215577]]]},{"type":"MultiPolygon","coordinates":[[[[-124.20644446076457,41.99764793234988],[-123.81914642769377,41.9929487879328],[-122.28470508120716,42.00076456697032],[-120.87190852960694,41.987672183888144],[-119.99345935149032,41.98920496180692],[-119.99632468471547,41.17756626185575],[-119.99616533549018,39.72061080735291],[-119.99525467228096,38.99410614055142],[-119.15245040318595,38.411800970345396],[-118.41741977577033,37.88667673623861],[-117.83868644227925,37.45729823013134],[-117.16042376916052,36.95959413311729],[-115.88576931962875,36.00122598269681],[-114.62106860184196,34.998914434177756],[-114.62726343248558,34.87553378953801],[-114.4656376786729,34.709873019093806],[-114.37650696388087,34.45967934957352],[-114.13412705304057,34.31454789830863],[-114.23577579952958,34.18622276532105],[-114.41016637948307,34.10265435385114],[-114.5182085733029,33.965063084133995],[-114.495676458155,33.70836940637377],[-114.52942052155765,33.56007298731965],[-114.64509225889323,33.4191160609645],[-114.72493627075204,33.4110596521638],[-114.67769336977383,33.26801652533659],[-114.7113551165578,33.09538277577242],[-114.46838717806588,32.97778947120211],[-114.46143631927075,32.84542253525382],[-114.60394229001307,32.72628521128817],[-114.72204897261417,32.72085749486049],[-116.10697355228972,32.619470721398905],[-117.12809810035759,32.53578134749692],[-117.12452932008097,32.678931501469606],[-117.28532538039805,32.85122049515134],[-117.25486792066924,32.888172834520184],[-117.32843939582528,33.11148196891144],[-117.41014420878057,33.23408949006667],[-117.59733131894704,33.39453395636812],[-118.10671743406967,33.74756460162992],[-118.24661621111534,33.77392498348795],[-118.28689224585024,33.70390742084922],[-118.40508896387189,33.73845071697225],[-118.41211037976872,33.88296756511329],[-118.54185442539641,34.037251754065416],[-118.93936008180945,34.04008134250335],[-119.21633452296778,34.146340648502004],[-119.26676741308628,34.238098242525666],[-119.6062935741322,34.41643494337904],[-119.86943322851923,34.404796285251464],[-120.14016284813587,34.47190235726591],[-120.45620266362754,34.442499472367864],[-120.64129300529791,34.572337801347324],[-120.60815883085152,34.855615861632096],[-120.66594654766467,34.90380952214605],[-120.63841021411147,35.140028326772395],[-120.86134195607545,35.20925375384414],[-120.8752123840259,35.427765160731276],[-120.99194802091932,35.45658105405849],[-121.14655930057644,35.62932276324084],[-121.270261544693,35.66353575680844],[-121.32908067993127,35.80103403827481],[-121.4455416000036,35.87985051701145],[-121.68981158122264,36.181134210890455],[-121.8822774193994,36.30694348070292],[-121.95528314264077,36.582773674238226],[-121.80856472643185,36.64822113632211],[-121.76139124286648,36.81899019948685],[-121.88353656838188,36.96209797775527],[-122.06133181341508,36.947506748400144],[-122.17344274829611,37.00086941596884],[-122.41463784895052,37.239126398722696],[-122.38925314437118,37.352412767258485],[-122.50568220495924,37.52290483422436],[-122.49821454906672,37.78294210010179],[-122.40093112176469,37.80862509234018],[-122.35967127651688,37.60978678746859],[-122.08930780785096,37.45254147962241],[-122.1997325212484,37.73520089606825],[-122.31241361138743,37.77846270841999],[-122.37968385040284,37.97344544585264],[-122.29552217907334,38.01479548193309],[-121.90276591699563,38.07290956419466],[-121.98454890224644,38.13950044503694],[-122.23224302686401,38.07107979371781],[-122.39846395438663,38.16133709095541],[-122.50645035525598,38.018652189060894],[-122.45825944035612,37.83422120920444],[-122.69172372059766,37.89439268889214],[-122.92118090658494,38.03062296288528],[-122.99464908448635,38.297227219625626],[-123.12154468500574,38.43359995472721],[-123.2979410655621,38.54733354753543],[-123.72190138718494,38.92477119974032],[-123.68344755953714,39.04180590135341],[-123.81371803781357,39.347806456630984],[-123.75465159009104,39.551879248863166],[-123.83810841566,39.82639688345133],[-124.0945604793803,40.10037777638692],[-124.34530627635289,40.25242998830002],[-124.39263786584661,40.43523691152021],[-124.10944616289558,40.97821095267061],[-124.14970323735204,41.12883223340646],[-124.05795476083932,41.45816418835635],[-124.14421035144275,41.7271932367705],[-124.24309892690667,41.77675716593153],[-124.20644446076457,41.99764793234988]]],[[[-120.16738607807474,33.92416218907543],[-120.23854871720113,34.01088525933072],[-120.04680109022709,34.04110524934277],[-119.96338591510585,33.94776317696897],[-120.16738607807474,33.92416218907543]]]]},{"type":"Polygon","coordinates":[[[-84.81148060280753,39.10258550866003],[-84.79455627492841,40.353050735430486],[-84.7903774502834,41.69749475802344],[-83.48269098387102,41.725129933683874],[-83.15374641952802,41.626089779600576],[-83.00343347643488,41.53819376228442],[-82.79583065334756,41.53764831755322],[-82.71694657033947,41.450524802073105],[-82.54883769640372,41.39133759913466],[-82.01560566388913,41.51531015672897],[-81.73850264510492,41.49115476200542],[-81.36226461904121,41.72428345567952],[-80.9997726912333,41.85025715151315],[-80.52059257903208,41.986872122303126],[-80.52199952493908,40.63720319609688],[-80.66862044594578,40.56827890590636],[-80.60183022315975,40.480539077769095],[-80.60451709146905,40.30624485332894],[-80.70206513380452,40.15408996580968],[-80.73888801487881,39.983475952134974],[-80.88110989226887,39.62408118062868],[-81.2376213027443,39.38847221315455],[-81.37591627853313,39.34569026162009],[-81.46500814029558,39.406858347418435],[-81.57268511563738,39.265917532119545],[-81.66752225258927,39.27049529967223],[-81.81956565781566,39.07701684793666],[-81.78172985235831,38.968529035769635],[-82.04288556744712,39.01413928064104],[-82.2167502327923,38.77893940966632],[-82.1842468761341,38.59503227225663],[-82.28997135722963,38.580081367455705],[-82.32917939988756,38.441952320005186],[-82.5866042916644,38.41251944056831],[-82.69557937262634,38.53914281086048],[-82.85385666874211,38.600458745387364],[-82.8731911795559,38.71900648758022],[-83.02694344463113,38.71451202092294],[-83.14314995506578,38.61933971183592],[-83.29004357253606,38.5966379384589],[-83.52655600245792,38.69611101889974],[-83.67853009387956,38.620928127293055],[-83.85755268021504,38.744918401868865],[-84.2287020990932,38.812690466614285],[-84.31331513901829,39.01407416296347],[-84.444918068993,39.11182693486278],[-84.5930686596761,39.07026559010548],[-84.74287558091206,39.14206376118764],[-84.81148060280753,39.10258550866003]]]},{"type":"Polygon","coordinates":[[[-89.12992987787915,36.98816566679051],[-89.26413041780322,37.08717427221378],[-89.38302871793091,37.04926350631136],[-89.51397668943505,37.27645224521585],[-89.42766535768519,37.411068046320025],[-89.525068037886,37.5720063605294],[-89.52161975380511,37.69484819135499],[-89.66656103244122,37.74550487492384],[-89.72855114473731,37.84104374939389],[-89.90065970494969,37.87595677094637],[-90.25417715277005,38.12222348706138],[-90.36488896415403,38.234353175004685],[-90.35880701451234,38.36538377395172],[-90.18381897857203,38.61032264892796],[-90.12183451291627,38.800559152071685],[-90.24403858421238,38.91455710089315],[-90.46995765791436,38.95922756868518],[-90.62733485884496,38.880845207799],[-90.70619360967777,39.037841700843785],[-90.73820752177139,39.247858229540455],[-91.03647492545434,39.4444584963004],[-91.09375071474979,39.52897316035461],[-91.36723698271685,39.724685505878654],[-91.51628404230237,40.134589837481805],[-91.44874716789599,40.371946621442405],[-91.372908333542,40.40303256777763],[-91.37576273611482,40.603480268742324],[-91.162644388753,40.65635235205758],[-91.08905027523171,40.83376751085345],[-90.96085092245187,40.95054158634415],[-90.95792989988433,41.10439326337104],[-91.10249647990322,41.267848166012094],[-91.05593552730012,41.40140732012392],[-90.65892972806358,41.46235067999919],[-90.34849428077409,41.58688241039517],[-90.30501587573347,41.756497072345155],[-90.19596567891435,41.80616699257086],[-90.14279675845313,41.98398953833284],[-90.16677674469916,42.1037669012057],[-90.36785826808632,42.21022668883696],[-90.44172507807119,42.360083652775],[-90.63845609822665,42.509363675125854],[-88.93918704205399,42.49087978663956],[-87.79738197948976,42.48915284718098],[-87.83701491887912,42.314235264734315],[-87.67060589088933,42.05985194352478],[-87.61267602379199,41.847365398227886],[-87.5299063270021,41.7236260624191],[-87.53269612993775,40.74544789190684],[-87.54023771019455,39.35056237972485],[-87.6252620223887,39.3074413707523],[-87.58861693277774,39.20850513557211],[-87.67035241372439,39.14671907938736],[-87.53349240982789,38.9637465386531],[-87.50790945118965,38.79560492456443],[-87.62521519153705,38.64285802048252],[-87.6514157061294,38.51541692342788],[-87.9860398581398,38.234860440158826],[-87.93231948367881,38.17117700922576],[-88.0347614018156,38.054130755311874],[-88.03560736177955,37.80572789963078],[-88.15940440728828,37.66073352185424],[-88.08791058493779,37.47632170949238],[-88.46768594622618,37.40080841172219],[-88.51136519552767,37.29690577508548],[-88.42255499232762,37.15696539939614],[-88.47684174035176,37.07220041822339],[-88.86334986542926,37.20224756928582],[-88.99324010205623,37.220087999798295],[-89.1696209932048,37.064287040375575],[-89.12992987787915,36.98816566679051]]]},{"type":"Polygon","coordinates":[[[-77.0451474330396,38.788233935009494],[-77.1223283028392,38.93217125136138],[-77.0420882490989,38.99354116569735],[-76.9109046728234,38.890100103052006],[-77.0451474330396,38.788233935009494]]]},{"type":"Polygon","coordinates":[[[-75.79109456932217,39.72386601777884],[-75.69477086365468,39.820457446722116],[-75.42046795680997,39.798983118255435],[-75.48928066109954,39.71485822779394],[-75.61037457183059,39.61290528798537],[-75.5898358243161,39.463879986096416],[-75.40212248871705,39.257750003654266],[-75.39736827660606,39.073148951136346],[-75.19057085091983,38.80878226627128],[-75.08276250053402,38.79992444898054],[-75.0456229931707,38.44960217070441],[-75.06792468395118,38.450075348800596],[-75.09272125727081,38.45056386089246],[-75.69880246121961,38.46318270325017],[-75.77235373280028,39.38311852469921],[-75.79109456932217,39.72386601777884]]]},{"type":"Polygon","coordinates":[[[-81.95957524370168,37.53117260350595],[-82.14250919042657,37.5574524818867],[-82.29562478385714,37.669058016559006],[-82.47577965108252,37.975907070198474],[-82.64612796183897,38.146330704028266],[-82.57457896818649,38.25597369447064],[-82.5866042916644,38.41251944056831],[-82.32917939988756,38.441952320005186],[-82.28997135722963,38.580081367455705],[-82.1842468761341,38.59503227225663],[-82.2167502327923,38.77893940966632],[-82.04288556744712,39.01413928064104],[-81.78172985235831,38.968529035769635],[-81.81956565781566,39.07701684793666],[-81.66752225258927,39.27049529967223],[-81.57268511563738,39.265917532119545],[-81.46500814029558,39.406858347418435],[-81.37591627853313,39.34569026162009],[-81.2376213027443,39.38847221315455],[-80.88110989226887,39.62408118062868],[-80.73888801487881,39.983475952134974],[-80.70206513380452,40.15408996580968],[-80.60451709146905,40.30624485332894],[-80.60183022315975,40.480539077769095],[-80.66862044594578,40.56827890590636],[-80.52199952493908,40.63720319609688],[-80.52426947433901,39.72120898859626],[-79.48097108785997,39.72027408109659],[-79.48986480535004,39.19739575931544],[-79.04885453105244,39.48381532015958],[-78.97043658079117,39.43852527605591],[-78.76145167773579,39.581792351745605],[-78.48127818173027,39.519937603404564],[-78.3479232391419,39.6405907653681],[-78.18297213223391,39.69464164960068],[-77.88517117212203,39.56445110495711],[-77.75698632447322,39.42516382279292],[-77.72746750213493,39.31779658380289],[-77.83068021257445,39.13218136360497],[-78.27688109621124,39.42346465029948],[-78.41354740480429,39.25754081894303],[-78.40236229104197,39.170594576885854],[-78.68022703642201,38.92168414522639],[-78.79305535364112,38.88021925959051],[-78.86656062323478,38.76340415530058],[-78.98745306805645,38.84676136170171],[-79.23166290478574,38.48049618307353],[-79.31699959533768,38.412633254042944],[-79.48634757009265,38.46214491292818],[-79.64240656543579,38.592355246714824],[-79.68409239529986,38.430238131588126],[-79.79362177948376,38.268665994956265],[-79.91616154095541,38.17926486307839],[-80.00049898339071,37.989870123771425],[-80.16000538214608,37.87722830109428],[-80.30310974134791,37.68267185910213],[-80.34751087993892,37.491177139448624],[-80.79924464220345,37.39175353186543],[-80.96789191552104,37.291791473096374],[-81.22293345885562,37.240214490766974],[-81.35879478447991,37.338952523692285],[-81.55665430383043,37.20635278039078],[-81.66588576298354,37.20491003789253],[-81.83888887534887,37.285505208323144],[-81.98820251852132,37.46658648718574],[-81.95957524370168,37.53117260350595]]]},{"type":"Polygon","coordinates":[[[-75.09272125727081,38.45056386089246],[-75.15061693370212,38.27388121121419],[-75.26249905014097,38.20153360648979],[-75.37242059090339,38.01683386727675],[-75.64786660568225,37.97025488686793],[-75.86538492913344,37.979780458226976],[-75.76920637838445,38.09737127620339],[-75.89745126691496,38.1750572871915],[-75.9495845210198,38.282177110089194],[-76.06511991012358,38.25905707089777],[-76.29394177137124,38.43705771894733],[-76.07565902751416,38.610900782008045],[-76.19484328593954,38.76537239797484],[-76.11353632800711,38.92082901594745],[-76.19934189691998,38.973466996808504],[-76.21811252076454,39.20496241272732],[-75.97846465135592,39.39466383194773],[-76.36371046740453,39.393387950260504],[-76.4717185741664,38.90835128779316],[-76.54880521241826,38.75908924144399],[-76.50857124256338,38.52222086596717],[-76.38548235827372,38.39140437311511],[-76.42113597037394,38.320623581563396],[-76.34345052923027,38.21318692516052],[-76.32983855163256,38.04583024587736],[-76.57695050245499,38.22276430055901],[-76.75992760194472,38.23440933058343],[-76.8638732877382,38.39147140754214],[-77.00209180076482,38.42697722271785],[-77.22062584601719,38.39078769782968],[-77.27745881438355,38.48722081362845],[-77.12969069292359,38.648241910692846],[-77.0451474330396,38.788233935009494],[-76.9109046728234,38.890100103052006],[-77.0420882490989,38.99354116569735],[-77.1223283028392,38.93217125136138],[-77.25569272556679,39.0276818408259],[-77.51275783828974,39.11675945647751],[-77.46170713319695,39.218735345475544],[-77.56867294268541,39.2984950721622],[-77.72746750213493,39.31779658380289],[-77.75698632447322,39.42516382279292],[-77.88517117212203,39.56445110495711],[-78.18297213223391,39.69464164960068],[-78.3479232391419,39.6405907653681],[-78.48127818173027,39.519937603404564],[-78.76145167773579,39.581792351745605],[-78.97043658079117,39.43852527605591],[-79.04885453105244,39.48381532015958],[-79.48986480535004,39.19739575931544],[-79.48097108785997,39.72027408109659],[-78.0959483395297,39.72546106415302],[-77.47579337677568,39.719623215145134],[-76.5698344405781,39.72026537801796],[-75.79109456932217,39.72386601777884],[-75.77235373280028,39.38311852469921],[-75.69880246121961,38.46318270325017],[-75.09272125727081,38.45056386089246]]]},{"type":"Polygon","coordinates":[[[-102.0372075952141,36.98899390977297],[-102.9977094504108,36.99852383267134],[-103.99363501138072,36.99446907870078],[-105.1461725240107,36.99320739132036],[-106.86124885756017,36.989501589359435],[-107.47246031914223,36.998776739991854],[-109.04848010571915,36.996640911250026],[-109.04346402418882,38.15293369869859],[-109.05586114525775,38.244920162968484],[-109.05141682491065,39.36096608135635],[-109.05126317412969,40.21051135108274],[-109.04831469542124,40.99843338472032],[-107.91867135637075,41.00337512745407],[-106.86543876826961,40.998457369990575],[-104.93449293023608,40.99428916517366],[-104.05170552644512,41.00321132308138],[-102.65227104975637,40.99812416640894],[-102.04773930462704,40.99807086005236],[-102.05153560824486,39.99891827005396],[-102.04897255158981,39.037002941641305],[-102.0460609055534,38.25382206549678],[-102.0372075952141,36.98899390977297]]]},{"type":"Polygon","coordinates":[[[-89.41478464590814,36.50267929345683],[-89.37395151053316,36.61624763137925],[-89.21012879921213,36.581954652374776],[-89.12992987787915,36.98816566679051],[-89.1696209932048,37.064287040375575],[-88.99324010205623,37.220087999798295],[-88.86334986542926,37.20224756928582],[-88.47684174035176,37.07220041822339],[-88.42255499232762,37.15696539939614],[-88.51136519552767,37.29690577508548],[-88.46768594622618,37.40080841172219],[-88.08791058493779,37.47632170949238],[-88.15940440728828,37.66073352185424],[-88.03560736177955,37.80572789963078],[-87.95873804147314,37.77622425587603],[-87.82364719732736,37.878255005351825],[-87.67972096703991,37.897049355446455],[-87.60432573067558,37.97115731323487],[-87.38755063977817,37.93496923885981],[-87.13187941834427,37.78973635528571],[-87.03648000034836,37.90800544355044],[-86.86327267645959,37.98692024635392],[-86.75382560889435,37.89835937599567],[-86.51690102603474,37.94224205976002],[-86.51909124901799,38.047047899824264],[-86.2976743089711,38.150304073852865],[-86.29144005545346,38.07848953269425],[-86.05271569665584,37.96678448246219],[-85.91475112703053,38.06487486128649],[-85.83990770729426,38.27629149775695],[-85.68138900435474,38.30095369139829],[-85.61264027805387,38.44667037289666],[-85.41746172135215,38.56147563586866],[-85.45367927222566,38.694674544690265],[-85.27139391207449,38.74437673883254],[-85.16093319486964,38.69517652583238],[-84.97561118553493,38.780641016949616],[-84.81878020639613,38.793409987413604],[-84.80322402319847,38.897190884557645],[-84.88999610007505,39.050648591864636],[-84.81148060280753,39.10258550866003],[-84.74287558091206,39.14206376118764],[-84.5930686596761,39.07026559010548],[-84.444918068993,39.11182693486278],[-84.31331513901829,39.01407416296347],[-84.2287020990932,38.812690466614285],[-83.85755268021504,38.744918401868865],[-83.67853009387956,38.620928127293055],[-83.52655600245792,38.69611101889974],[-83.29004357253606,38.5966379384589],[-83.14314995506578,38.61933971183592],[-83.02694344463113,38.71451202092294],[-82.8731911795559,38.71900648758022],[-82.85385666874211,38.600458745387364],[-82.69557937262634,38.53914281086048],[-82.5866042916644,38.41251944056831],[-82.57457896818649,38.25597369447064],[-82.64612796183897,38.146330704028266],[-82.47577965108252,37.975907070198474],[-82.29562478385714,37.669058016559006],[-82.14250919042657,37.5574524818867],[-81.95957524370168,37.53117260350595],[-82.35384231878545,37.26051960206362],[-82.71909581632752,37.11001731520635],[-82.7235981571988,37.03399234893867],[-82.86655984807601,36.97458575589321],[-82.87804288686912,36.893694214552994],[-83.06795193667959,36.850996133758386],[-83.13851354534046,36.7400592856271],[-83.53089495338882,36.66148095005974],[-83.67517676660295,36.59870388260062],[-83.69560864238409,36.584249415909596],[-84.78187076077195,36.6050761420793],[-85.43737462426624,36.618198985936665],[-86.51066817122617,36.65507418909078],[-87.85353740282436,36.64152240778691],[-88.07134106292474,36.67968323178767],[-88.04276341637488,36.496570353910585],[-89.41478464590814,36.50267929345683]]]},{"type":"Polygon","coordinates":[[[-102.0372075952141,36.98899390977297],[-102.0460609055534,38.25382206549678],[-102.04897255158981,39.037002941641305],[-102.05153560824486,39.99891827005396],[-100.73504944867398,39.999172317063355],[-99.06474698377924,39.99833796120423],[-97.92958869029866,39.99845286256369],[-96.80142031585895,39.9944759700644],[-95.78070020192693,39.993489465741455],[-95.30869722856508,39.999407559206425],[-95.06324627065904,39.86653796866351],[-94.93824374515269,39.896081812352854],[-94.88850513277069,39.81739986870663],[-95.1089880977906,39.560691996639605],[-94.92574798919267,39.38126611585713],[-94.8208192699469,39.21100462867077],[-94.60122432977094,39.14122764399117],[-94.61871772502326,38.47147373254546],[-94.62037965041235,36.99704684770303],[-96.00604969021535,36.9983338154547],[-97.46540491504093,36.996467160501766],[-98.54021963581482,36.99837593213876],[-99.43747362844202,36.99455838886477],[-100.95058683746123,36.99666168466983],[-102.0372075952141,36.98899390977297]]]},{"type":"MultiPolygon","coordinates":[[[[-81.66983504392981,36.58976778940628],[-83.21092652676263,36.58808964935285],[-83.67517676660295,36.59870388260062],[-83.53089495338882,36.66148095005974],[-83.13851354534046,36.7400592856271],[-83.06795193667959,36.850996133758386],[-82.87804288686912,36.893694214552994],[-82.86655984807601,36.97458575589321],[-82.7235981571988,37.03399234893867],[-82.71909581632752,37.11001731520635],[-82.35384231878545,37.26051960206362],[-81.95957524370168,37.53117260350595],[-81.98820251852132,37.46658648718574],[-81.83888887534887,37.285505208323144],[-81.66588576298354,37.20491003789253],[-81.55665430383043,37.20635278039078],[-81.35879478447991,37.338952523692285],[-81.22293345885562,37.240214490766974],[-80.96789191552104,37.291791473096374],[-80.79924464220345,37.39175353186543],[-80.34751087993892,37.491177139448624],[-80.30310974134791,37.68267185910213],[-80.16000538214608,37.87722830109428],[-80.00049898339071,37.989870123771425],[-79.91616154095541,38.17926486307839],[-79.79362177948376,38.268665994956265],[-79.68409239529986,38.430238131588126],[-79.64240656543579,38.592355246714824],[-79.48634757009265,38.46214491292818],[-79.31699959533768,38.412633254042944],[-79.23166290478574,38.48049618307353],[-78.98745306805645,38.84676136170171],[-78.86656062323478,38.76340415530058],[-78.79305535364112,38.88021925959051],[-78.68022703642201,38.92168414522639],[-78.40236229104197,39.170594576885854],[-78.41354740480429,39.25754081894303],[-78.27688109621124,39.42346465029948],[-77.83068021257445,39.13218136360497],[-77.72746750213493,39.31779658380289],[-77.56867294268541,39.2984950721622],[-77.46170713319695,39.218735345475544],[-77.51275783828974,39.11675945647751],[-77.25569272556679,39.0276818408259],[-77.1223283028392,38.93217125136138],[-77.0451474330396,38.788233935009494],[-77.12969069292359,38.648241910692846],[-77.22729654856705,38.65083941703411],[-77.33818962228503,38.43694877505239],[-77.24040152003082,38.3314974566568],[-77.05423210021904,38.37547639232642],[-76.93615515313657,38.202603100883906],[-76.59528338216634,38.12035284319741],[-76.5577218790978,38.025459343450635],[-76.25886649956726,37.89015822670879],[-76.32420693450567,37.79894530035574],[-76.31430909931925,37.55133489106588],[-76.44653854734688,37.45810393835666],[-76.39240633077237,37.2935674709803],[-76.46080693392825,37.255575372735976],[-76.28533857093431,37.12224047831086],[-76.29300655304733,37.020635143606896],[-76.42578636718991,36.96540732340241],[-76.62459296798937,37.132421733397024],[-76.66532021590774,37.05428259247599],[-76.48918166405565,36.961871386886784],[-75.99501396979359,36.92328100379103],[-75.87781106046445,36.55602828475912],[-75.90163102403267,36.55635231902578],[-75.99831471597018,36.55680534535063],[-76.02681921521635,36.55687004859588],[-76.04561118232516,36.55710643042782],[-77.31974634816565,36.554068382535206],[-78.45852952569756,36.54162349814192],[-80.02382230163288,36.54516300913626],[-81.34512100466316,36.572988305621415],[-81.66983504392981,36.58976778940628]]],[[[-75.64786660568225,37.97025488686793],[-75.37242059090339,38.01683386727675],[-75.69914364262333,37.58964537693656],[-75.89676222138644,37.3675306364785],[-75.90564630332517,37.59230634322614],[-75.69573483322048,37.82464378200192],[-75.7336306277555,37.93069421411357],[-75.64786660568225,37.97025488686793]]]]},{"type":"Polygon","coordinates":[[[-89.41478464590814,36.50267929345683],[-89.4758977158166,36.49860899827444],[-89.53327229541524,36.49817016625639],[-89.54172536774588,36.257346189740495],[-89.67686884479573,36.22093546160394],[-89.58950159131008,36.129861421880605],[-89.72183635694988,35.99995092987422],[-90.37906218671498,35.98965643115784],[-90.31533969553617,36.0917233916572],[-90.06618775344486,36.27233827875277],[-90.05215694018834,36.38261503981359],[-90.15025944115787,36.491872919026804],[-91.13395634779509,36.488015693858614],[-92.85227571782123,36.4898845245812],[-93.85751984120861,36.48978635592647],[-94.6172571101314,36.48941414390314],[-94.62037965041235,36.99704684770303],[-94.61871772502326,38.47147373254546],[-94.60122432977094,39.14122764399117],[-94.8208192699469,39.21100462867077],[-94.92574798919267,39.38126611585713],[-95.1089880977906,39.560691996639605],[-94.88850513277069,39.81739986870663],[-94.93824374515269,39.896081812352854],[-95.06324627065904,39.86653796866351],[-95.30869722856508,39.999407559206425],[-95.47682210994901,40.22685490387577],[-95.63418501296472,40.35880015494306],[-95.76747960384715,40.589047974180176],[-94.23839179040375,40.570966136843936],[-92.71781543244344,40.58966718786354],[-91.74171175469033,40.609784354105116],[-91.44874716789599,40.371946621442405],[-91.51628404230237,40.134589837481805],[-91.36723698271685,39.724685505878654],[-91.09375071474979,39.52897316035461],[-91.03647492545434,39.4444584963004],[-90.73820752177139,39.247858229540455],[-90.70619360967777,39.037841700843785],[-90.62733485884496,38.880845207799],[-90.46995765791436,38.95922756868518],[-90.24403858421238,38.91455710089315],[-90.12183451291627,38.800559152071685],[-90.18381897857203,38.61032264892796],[-90.35880701451234,38.36538377395172],[-90.36488896415403,38.234353175004685],[-90.25417715277005,38.12222348706138],[-89.90065970494969,37.87595677094637],[-89.72855114473731,37.84104374939389],[-89.66656103244122,37.74550487492384],[-89.52161975380511,37.69484819135499],[-89.525068037886,37.5720063605294],[-89.42766535768519,37.411068046320025],[-89.51397668943505,37.27645224521585],[-89.38302871793091,37.04926350631136],[-89.26413041780322,37.08717427221378],[-89.12992987787915,36.98816566679051],[-89.21012879921213,36.581954652374776],[-89.37395151053316,36.61624763137925],[-89.41478464590814,36.50267929345683]]]},{"type":"Polygon","coordinates":[[[-114.62106860184196,34.998914434177756],[-114.55958306088996,35.22018285204358],[-114.67221514440769,35.51575416629822],[-114.66160013409934,35.88047356419372],[-114.73621250781974,35.987648351177256],[-114.71276169983652,36.105181045021425],[-114.53057357586738,36.155090196301245],[-114.344233927982,36.137480241960205],[-114.23347259193633,36.01833105486952],[-114.12902306005532,36.04173047324562],[-114.03739207510402,36.216022884544394],[-114.04393938043196,36.99653792481963],[-112.89998346595446,36.99622689336687],[-112.23725786034284,36.99549215667557],[-110.48408898051656,37.003926009707584],[-110.45223581635732,36.991746310192156],[-109.04848010571915,36.996640911250026],[-109.04784649051284,35.99666396357212],[-109.04664080329904,34.95464622475194],[-109.05034924726598,33.78330192905786],[-109.04949530947995,32.4420444765386],[-109.0456150315142,31.343453048569422],[-110.4525783964701,31.337660217271807],[-111.07196474269104,31.335634005877417],[-111.36952087691256,31.43153167512459],[-113.3291112923149,32.04362105976294],[-114.82176123230508,32.487169265756464],[-114.8093938467548,32.616044661250925],[-114.72204897261417,32.72085749486049],[-114.60394229001307,32.72628521128817],[-114.46143631927075,32.84542253525382],[-114.46838717806588,32.97778947120211],[-114.7113551165578,33.09538277577242],[-114.67769336977383,33.26801652533659],[-114.72493627075204,33.4110596521638],[-114.64509225889323,33.4191160609645],[-114.52942052155765,33.56007298731965],[-114.495676458155,33.70836940637377],[-114.5182085733029,33.965063084133995],[-114.41016637948307,34.10265435385114],[-114.23577579952958,34.18622276532105],[-114.13412705304057,34.31454789830863],[-114.37650696388087,34.45967934957352],[-114.4656376786729,34.709873019093806],[-114.62726343248558,34.87553378953801],[-114.62106860184196,34.998914434177756]]]},{"type":"Polygon","coordinates":[[[-94.47669125246995,33.63208184543019],[-94.74186525148555,33.701377104347095],[-94.96892681147322,33.86632282363499],[-95.2342706241301,33.9649694224307],[-95.25122282258245,33.905128711534786],[-95.45184126966112,33.86585860763762],[-95.60631200495924,33.94465648872409],[-95.768761546607,33.85150329387807],[-95.93332795671814,33.89062886450522],[-96.27833835239878,33.773489466928424],[-96.34785056663283,33.70563182190987],[-96.66651192554005,33.91364436314506],[-96.74910181050907,33.83184050086637],[-96.98814807960775,33.94430287435092],[-97.15276396257656,33.72877377420997],[-97.21162666501199,33.905790456334515],[-97.4530350947008,33.83631502296846],[-97.67137098950232,33.98871142091957],[-97.85285737595329,33.857170966616415],[-97.95504851073517,33.88357942262304],[-97.98299518408473,34.00138242994498],[-98.08652198241533,34.005410349423116],[-98.17316429017315,34.115461555696236],[-98.35073025052782,34.14221321346412],[-98.44851949247088,34.05446929280774],[-98.62632996789168,34.15852760058295],[-98.70563226491014,34.13080637841301],[-98.99654463468228,34.20958369329584],[-99.17651176406876,34.212816524376734],[-99.20584916866098,34.332075484226976],[-99.36456923390178,34.45027235766074],[-99.41032302776645,34.36918561869993],[-99.57821950514051,34.40898868255479],[-99.68527690417069,34.37752068142874],[-99.9322869046435,34.57917334435067],[-99.99647526954894,34.56238396599427],[-99.99474340870661,35.424622157854756],[-100.00155071850847,36.49255476379384],[-101.09010236822317,36.48805024715291],[-102.1656735833849,36.49023415004334],[-102.99740100916,36.49237018600134],[-102.9977094504108,36.99852383267134],[-102.0372075952141,36.98899390977297],[-100.95058683746123,36.99666168466983],[-99.43747362844202,36.99455838886477],[-98.54021963581482,36.99837593213876],[-97.46540491504093,36.996467160501766],[-96.00604969021535,36.9983338154547],[-94.62037965041235,36.99704684770303],[-94.6172571101314,36.48941414390314],[-94.54241726487386,36.106835821453075],[-94.4285519861974,35.40054628233173],[-94.4616914446558,34.196765198170155],[-94.47669125246995,33.63208184543019]]]},{"type":"MultiPolygon","coordinates":[[[[-84.32377349391139,34.98909057515964],[-84.29095952023276,35.21062226115387],[-84.04268969732493,35.27265847904505],[-84.01255673809914,35.40770679207445],[-83.77577471995606,35.55269293300873],[-83.50568368873351,35.55964539772908],[-83.24372454479712,35.71831298547794],[-82.98687384899337,35.77409106818929],[-82.76309490376848,35.999650000209144],[-82.60426423690349,36.04309405917161],[-82.47505522339507,35.99328442345154],[-82.4082829248067,36.07542661791177],[-82.20758459589922,36.147127552811924],[-82.02029496553871,36.12983432836799],[-81.91099403716872,36.290875318183524],[-81.73032460041964,36.329467203596415],[-81.66983504392981,36.58976778940628],[-81.34512100466316,36.572988305621415],[-80.02382230163288,36.54516300913626],[-78.45852952569756,36.54162349814192],[-77.31974634816565,36.554068382535206],[-76.04561118232516,36.55710643042782],[-75.79968678730273,36.11297895166534],[-76.11235845956249,36.174578047071776],[-76.52267292374584,36.00732958642699],[-76.68982300851974,36.049770045733496],[-76.74079455704027,35.936787404280906],[-76.40912836387751,35.977628931910274],[-76.3711391666594,35.93250548959743],[-76.21341990365643,35.9770370189557],[-75.98749155703138,35.892867784236444],[-75.81768107581233,35.923684349566614],[-75.74858448538666,35.86950789234244],[-75.72898898582218,35.6653463597907],[-75.77867284133451,35.578859671367354],[-75.89112184937687,35.631437352326515],[-76.05260830212751,35.41477488341082],[-76.18125223717378,35.34170186672222],[-76.62842113109144,35.43806313031829],[-76.70502925543103,35.41210106971947],[-76.61416704242495,35.27308674303906],[-76.6697123177831,34.97015868534032],[-76.31434872940942,34.94897901824994],[-76.46954580914445,34.78522339315998],[-76.62496300424304,34.719915232138135],[-77.050199052141,34.699079284849404],[-77.53832634360099,34.45717576395574],[-77.86409438785397,34.19290807661004],[-77.89410933747793,34.069351764472565],[-78.03451791807568,33.91446550897413],[-78.57945351917925,33.88216460250206],[-79.66728234713173,34.800820190724565],[-80.79985577445666,34.816260073853705],[-80.78544461594261,34.940788126162886],[-80.92759189551587,35.101394687303724],[-81.04909899526545,35.15167278695239],[-82.38945070595925,35.20835655968518],[-82.77120114805511,35.08553767804906],[-83.10615694952598,35.000366708619254],[-83.54929730231704,34.98962850830513],[-84.32377349391139,34.98909057515964]]],[[[-75.90163102403267,36.55635231902578],[-75.87781106046445,36.55602828475912],[-75.70235880852678,36.050028029849884],[-75.74049207277857,36.05048872317256],[-75.90163102403267,36.55635231902578]]]]},{"type":"Polygon","coordinates":[[[-84.32377349391139,34.98909057515964],[-85.60896022270053,34.99016416207288],[-86.78237222482458,34.9970753389738],[-87.98607824493303,35.01603364885324],[-88.19399360179024,35.004453632898304],[-89.00619639592682,35.00023471192678],[-90.30544833585468,35.00078875612853],[-90.06462860727001,35.14747463940068],[-90.10643819698429,35.314772417491],[-89.99965364982981,35.445537002695545],[-90.0331400399403,35.55249498977405],[-89.8934872802779,35.65605053934655],[-89.95112155352624,35.73434540321012],[-89.70151839825145,35.84211313922901],[-89.72183635694988,35.99995092987422],[-89.58950159131008,36.129861421880605],[-89.67686884479573,36.22093546160394],[-89.54172536774588,36.257346189740495],[-89.53327229541524,36.49817016625639],[-89.4758977158166,36.49860899827444],[-89.41478464590814,36.50267929345683],[-88.04276341637488,36.496570353910585],[-88.07134106292474,36.67968323178767],[-87.85353740282436,36.64152240778691],[-86.51066817122617,36.65507418909078],[-85.43737462426624,36.618198985936665],[-84.78187076077195,36.6050761420793],[-83.69560864238409,36.584249415909596],[-83.67517676660295,36.59870388260062],[-83.21092652676263,36.58808964935285],[-81.66983504392981,36.58976778940628],[-81.73032460041964,36.329467203596415],[-81.91099403716872,36.290875318183524],[-82.02029496553871,36.12983432836799],[-82.20758459589922,36.147127552811924],[-82.4082829248067,36.07542661791177],[-82.47505522339507,35.99328442345154],[-82.60426423690349,36.04309405917161],[-82.76309490376848,35.999650000209144],[-82.98687384899337,35.77409106818929],[-83.24372454479712,35.71831298547794],[-83.50568368873351,35.55964539772908],[-83.77577471995606,35.55269293300873],[-84.01255673809914,35.40770679207445],[-84.04268969732493,35.27265847904505],[-84.29095952023276,35.21062226115387],[-84.32377349391139,34.98909057515964]]]},{"type":"MultiPolygon","coordinates":[[[[-106.53951479385795,31.786305267293148],[-106.61498654478851,31.817834397185734],[-106.62362564542477,32.00108880369856],[-106.00324036191141,32.00165802648386],[-104.85106806775944,32.00326503959115],[-104.0192969711791,32.00740350888943],[-103.05841378644813,32.00202277872552],[-103.06001820935344,32.515545498201],[-103.03325852195944,33.826181583010694],[-103.02265703250538,34.74533278047847],[-103.02229404160107,35.623647993349095],[-103.02728681131366,36.491591830308835],[-102.99740100916,36.49237018600134],[-102.1656735833849,36.49023415004334],[-101.09010236822317,36.48805024715291],[-100.00155071850847,36.49255476379384],[-99.99474340870661,35.424622157854756],[-99.99647526954894,34.56238396599427],[-99.9322869046435,34.57917334435067],[-99.68527690417069,34.37752068142874],[-99.57821950514051,34.40898868255479],[-99.41032302776645,34.36918561869993],[-99.36456923390178,34.45027235766074],[-99.20584916866098,34.332075484226976],[-99.17651176406876,34.212816524376734],[-98.99654463468228,34.20958369329584],[-98.70563226491014,34.13080637841301],[-98.62632996789168,34.15852760058295],[-98.44851949247088,34.05446929280774],[-98.35073025052782,34.14221321346412],[-98.17316429017315,34.115461555696236],[-98.08652198241533,34.005410349423116],[-97.98299518408473,34.00138242994498],[-97.95504851073517,33.88357942262304],[-97.85285737595329,33.857170966616415],[-97.67137098950232,33.98871142091957],[-97.4530350947008,33.83631502296846],[-97.21162666501199,33.905790456334515],[-97.15276396257656,33.72877377420997],[-96.98814807960775,33.94430287435092],[-96.74910181050907,33.83184050086637],[-96.66651192554005,33.91364436314506],[-96.34785056663283,33.70563182190987],[-96.27833835239878,33.773489466928424],[-95.93332795671814,33.89062886450522],[-95.768761546607,33.85150329387807],[-95.60631200495924,33.94465648872409],[-95.45184126966112,33.86585860763762],[-95.25122282258245,33.905128711534786],[-95.2342706241301,33.9649694224307],[-94.96892681147322,33.86632282363499],[-94.74186525148555,33.701377104347095],[-94.47669125246995,33.63208184543019],[-94.37095894896446,33.547802475323095],[-94.15970995036561,33.593893979720846],[-94.03611649473187,33.55603470703363],[-94.03893173345088,33.02342240624279],[-94.03525561520455,31.994679245311474],[-93.88145154608989,31.87158880690064],[-93.79245262077418,31.711568045837723],[-93.83280517007533,31.590360114415887],[-93.70597743284759,31.520746934108978],[-93.68176671140992,31.31286374756025],[-93.55076455288052,31.191116639695984],[-93.50738887525011,31.039099809941817],[-93.55085520994953,30.82854275789769],[-93.73547936706903,30.545719692491268],[-93.6967413424609,30.442835730485996],[-93.75934709396161,30.34107715943339],[-93.69937687296712,30.2975935221848],[-93.71264388746623,30.06073100056444],[-93.76036752993039,30.006176425656435],[-93.85650023410447,29.96481499268731],[-93.95193664018453,29.818579079301685],[-93.83512511037331,29.674791942860118],[-94.06558154447724,29.674296903459286],[-94.68271213560504,29.433138324652685],[-94.78828369117618,29.53878660200621],[-94.7066170059939,29.658741808146445],[-94.73592306914225,29.793207636556453],[-94.8873631645254,29.66876588977697],[-94.989539483352,29.67992862419426],[-95.01432776802532,29.559494541513494],[-94.91135760409843,29.500563923982362],[-94.89133617172173,29.39955785840658],[-95.06657234901091,29.1961168164353],[-95.16073012778965,29.200271448593888],[-95.24861811547969,28.978637656837932],[-95.52680730955872,28.803496695373227],[-95.78659265239239,28.73913255936199],[-96.23783370643785,28.57159575743372],[-96.28621950813407,28.661994997739377],[-96.56695839342596,28.574374577913012],[-96.39097556451641,28.434339141811314],[-96.6615679552326,28.306547072389503],[-96.70407156366318,28.396166765509754],[-96.78849339487871,28.352753011910362],[-96.77819433740687,28.229635790811137],[-96.95117134053633,28.11464615726279],[-97.19573261586913,27.812525413714603],[-97.28375430978497,27.871447846207506],[-97.39683040572469,27.77114605654783],[-97.2500614287733,27.689142904129433],[-97.33172712967881,27.562636507358306],[-97.4125283765783,27.321344999386515],[-97.60038272277268,27.300455124092736],[-97.4792602680159,26.99683802086549],[-97.56883178337948,26.978188618473197],[-97.4261157990613,26.518569763366383],[-97.47496825154474,26.477150827913484],[-97.36895491112531,26.35940936379039],[-97.35361972395988,26.182802658833932],[-97.17247477793282,25.95492736099482],[-97.30739881307161,25.96548238222551],[-97.43460694736093,25.845557429644302],[-97.59035309810993,25.9335890699357],[-97.64824033048282,26.023801038638805],[-97.86770788452579,26.060496067343774],[-98.20097958847869,26.0557321678774],[-98.45368891395795,26.221261615081637],[-98.67821906955868,26.24240470852017],[-98.82013644280494,26.375413755537245],[-99.10703648611484,26.419869132957544],[-99.28583698853326,26.85767874648274],[-99.45538140420577,27.02895818304398],[-99.43747502715108,27.199502468481608],[-99.54390787668184,27.31895388033835],[-99.49081319140913,27.491051458094372],[-99.549507012676,27.6129196319988],[-99.71481795044191,27.661849117088874],[-99.87506302299558,27.797972053112304],[-99.94218914317328,27.9871619074433],[-100.09726251486215,28.15455547120254],[-100.29826643579825,28.280622103482912],[-100.49826406326834,28.661243683755465],[-100.59014888801285,28.89446945819946],[-100.64758495900631,28.92259563254565],[-100.66913227936455,29.080312719778966],[-100.79735737875198,29.242736307602964],[-101.00943140848287,29.373482502373513],[-101.06773768373074,29.473776314211115],[-101.26181157109555,29.526692016527576],[-101.25496887913476,29.628964172827132],[-101.36878670531111,29.657372834600356],[-101.47085578977608,29.78889520929375],[-101.64006451527305,29.757163370194853],[-101.81949868470184,29.81432482797527],[-102.06440274736357,29.78476886214069],[-102.32475088928165,29.880309238927886],[-102.38521537261639,29.768141785839838],[-102.67679047146503,29.74441879943344],[-102.80516036314269,29.530343838679414],[-102.9087638832557,29.269406684832973],[-103.15391147670682,28.97889165204328],[-103.47453149454101,29.07233821316462],[-103.52669655632607,29.146848532927322],[-103.72077919857357,29.19083238998069],[-103.78746306766662,29.26745771326138],[-104.04610514715401,29.328313472505968],[-104.20521213676534,29.484228659835644],[-104.3780739277111,29.550794571130908],[-104.53572973076577,29.679642769504664],[-104.67485201706435,29.909448855697526],[-104.70309739250528,30.23864161319346],[-104.85348560686772,30.392411439838042],[-104.89116916025317,30.57070042917109],[-105.21484406229281,30.812223553003193],[-105.39082139997419,30.853217280900417],[-105.60373377447522,31.086558630156393],[-105.77024988141453,31.170908868189436],[-105.9988868022414,31.39394007390913],[-106.21328553824189,31.47824643392077],[-106.38358121609427,31.73387274125249],[-106.53951479385795,31.786305267293148]]],[[[-96.39813296601676,28.346128725779828],[-96.83488935161623,28.06661567947306],[-96.80410428314202,28.17245003693623],[-96.53239116383672,28.318528517846012],[-96.39813296601676,28.346128725779828]]]]},{"type":"Polygon","coordinates":[[[-109.04848010571915,36.996640911250026],[-107.47246031914223,36.998776739991854],[-106.86124885756017,36.989501589359435],[-105.1461725240107,36.99320739132036],[-103.99363501138072,36.99446907870078],[-102.9977094504108,36.99852383267134],[-102.99740100916,36.49237018600134],[-103.02728681131366,36.491591830308835],[-103.02229404160107,35.623647993349095],[-103.02265703250538,34.74533278047847],[-103.03325852195944,33.826181583010694],[-103.06001820935344,32.515545498201],[-103.05841378644813,32.00202277872552],[-104.0192969711791,32.00740350888943],[-104.85106806775944,32.00326503959115],[-106.00324036191141,32.00165802648386],[-106.62362564542477,32.00108880369856],[-106.61498654478851,31.817834397185734],[-106.53951479385795,31.786305267293148],[-107.2835671983491,31.785083106394815],[-108.20325493025331,31.78690324132034],[-108.21064778111288,31.34385359740233],[-109.0456150315142,31.343453048569422],[-109.04949530947995,32.4420444765386],[-109.05034924726598,33.78330192905786],[-109.04664080329904,34.95464622475194],[-109.04784649051284,35.99666396357212],[-109.04848010571915,36.996640911250026]]]},{"type":"Polygon","coordinates":[[[-85.00160717777958,31.00125338465638],[-86.38391974598281,30.99153831412108],[-87.59858024827001,31.00263075045686],[-87.6257115778429,30.876901984121673],[-87.52660288701544,30.748491685293256],[-87.39864494105937,30.668015353329107],[-87.41881665695448,30.481700778598828],[-87.46644036942656,30.359721433225776],[-87.59340481751438,30.278415355962007],[-87.75750297091308,30.29942225658087],[-87.90346577340281,30.421296077125593],[-87.91338515906963,30.621184398072472],[-88.01978884292619,30.744190033270755],[-88.13568116186168,30.33715854647847],[-88.40141516254357,30.39355180215811],[-88.43456311686444,31.120879479734093],[-88.47295193044275,31.888876799136597],[-88.33946633806693,32.98749718556381],[-88.24819559840586,33.74272641517099],[-88.09046866840505,34.89562966431938],[-88.19399360179024,35.004453632898304],[-87.98607824493303,35.01603364885324],[-86.78237222482458,34.9970753389738],[-85.60896022270053,34.99016416207288],[-85.41656722100325,34.08692037919014],[-85.29382500934548,33.425875711050075],[-85.18071974773156,32.871813015258766],[-85.07077442891504,32.581253845427476],[-84.96538506815061,32.42945018929558],[-85.00533245805934,32.32959251566597],[-84.8946034995383,32.26873540951636],[-85.05331367020757,32.126637654604785],[-85.13556693252835,31.85488443897295],[-85.04269845268306,31.51965992994953],[-85.10295711856912,31.196922059375183],[-85.00160717777958,31.00125338465638]]]},{"type":"Polygon","coordinates":[[[-88.40141516254357,30.39355180215811],[-88.46423729951701,30.326076470950575],[-88.57776077514129,30.380749832521005],[-88.6832644156167,30.34232283936563],[-88.88572646485076,30.39828886713206],[-89.27612134339894,30.31484074464172],[-89.43812132959248,30.20096707371087],[-89.57388396852164,30.194935322183383],[-89.69568148171628,30.478246070817036],[-89.8417855020175,30.679519838994544],[-89.7327174846088,31.00744500344956],[-90.56025489606638,31.001706307373155],[-91.63229742727802,31.001365022361362],[-91.55208130700395,31.05815981115066],[-91.62011389426368,31.127694404729745],[-91.63421422854113,31.277694036992386],[-91.51707814642286,31.283069638556398],[-91.5029570387256,31.534880474775704],[-91.42357801992475,31.562746489235856],[-91.33484640345252,31.843478432786476],[-91.2015421252147,31.91444887892656],[-91.10882040621313,32.13514351525161],[-90.97732476240408,32.223554153895506],[-90.98755564576003,32.453106452099185],[-91.11779193337043,32.498709288992956],[-91.15645023156188,32.76281109980439],[-91.07963556451706,32.877290826192585],[-91.20927014820943,32.93597806834646],[-91.1622413533262,33.01316261623283],[-91.09211028803706,33.225816125948825],[-91.16813338935933,33.57735590275974],[-91.14300262818129,33.77192855941624],[-91.01857196746626,33.93641342996932],[-91.06980548901421,34.00620118988912],[-90.8864503236447,34.04081809955218],[-90.75541796336032,34.37226909873513],[-90.6573464930104,34.36601433081788],[-90.53071996267182,34.55575170204166],[-90.58809526752702,34.627916127682624],[-90.46632614294599,34.67214004465473],[-90.45200553789287,34.825315834379126],[-90.2429391988875,34.9208271491002],[-90.30544833585468,35.00078875612853],[-89.00619639592682,35.00023471192678],[-88.19399360179024,35.004453632898304],[-88.09046866840505,34.89562966431938],[-88.24819559840586,33.74272641517099],[-88.33946633806693,32.98749718556381],[-88.47295193044275,31.888876799136597],[-88.43456311686444,31.120879479734093],[-88.40141516254357,30.39355180215811]]]},{"type":"Polygon","coordinates":[[[-85.60896022270053,34.99016416207288],[-84.32377349391139,34.98909057515964],[-83.54929730231704,34.98962850830513],[-83.10615694952598,35.000366708619254],[-83.12563651165021,34.940790457344654],[-83.3226905817956,34.78724432054235],[-83.33979000732802,34.67769266062149],[-83.16487890038628,34.59893736245543],[-83.05499481394438,34.49006158983707],[-82.90505501534729,34.4779853429884],[-82.76416999299886,34.28096017949701],[-82.73578075774043,34.1697961706528],[-82.57661476332817,33.95928781440575],[-82.26621791004804,33.76159572571068],[-82.19218765831877,33.62383992636428],[-81.91663808726508,33.451332889480575],[-81.94033579330024,33.40816328831903],[-81.7042792389254,33.12293884666464],[-81.52960073212071,33.043927843759924],[-81.43233129190932,32.841681610154154],[-81.4121052853809,32.62560903383551],[-81.27430239616265,32.554813996172946],[-81.12404819885023,32.276644539432944],[-81.10487578287582,32.1054460207813],[-80.89475357393871,32.00599392097642],[-81.13682405925147,31.72707382370502],[-81.134936993507,31.64607012661943],[-81.23914511856425,31.55688310083653],[-81.19477050364144,31.50515215690193],[-81.31306596016223,31.33759753438409],[-81.38100607721158,31.14894582041474],[-81.52838810316564,31.131128131875563],[-81.48482738150638,30.94490012169518],[-81.5285954747355,30.72145267051863],[-81.71676883020471,30.74536888599212],[-81.94380500621307,30.82424944632554],[-82.03188119797838,30.757532785275515],[-82.00580164581812,30.570990531791924],[-82.05276682534092,30.363794474022257],[-82.16463920262036,30.361291820877184],[-82.2210395554534,30.567076011356114],[-83.13244040238547,30.621341416115996],[-84.28166328535629,30.69041914987131],[-84.86300370893592,30.712664529660927],[-85.00160717777958,31.00125338465638],[-85.10295711856912,31.196922059375183],[-85.04269845268306,31.51965992994953],[-85.13556693252835,31.85488443897295],[-85.05331367020757,32.126637654604785],[-84.8946034995383,32.26873540951636],[-85.00533245805934,32.32959251566597],[-84.96538506815061,32.42945018929558],[-85.07077442891504,32.581253845427476],[-85.18071974773156,32.871813015258766],[-85.29382500934548,33.425875711050075],[-85.41656722100325,34.08692037919014],[-85.60896022270053,34.99016416207288]]]},{"type":"Polygon","coordinates":[[[-83.10615694952598,35.000366708619254],[-82.77120114805511,35.08553767804906],[-82.38945070595925,35.20835655968518],[-81.04909899526545,35.15167278695239],[-80.92759189551587,35.101394687303724],[-80.78544461594261,34.940788126162886],[-80.79985577445666,34.816260073853705],[-79.66728234713173,34.800820190724565],[-78.57945351917925,33.88216460250206],[-78.85488083269989,33.71636219981404],[-79.27084597789664,33.2970378734842],[-79.20191168952653,33.183688459432425],[-79.41061871571438,33.01386813544589],[-79.58235760230136,33.016012874482506],[-79.58764581045085,32.925106731650985],[-79.75232054280846,32.79423558553732],[-79.90748591847135,32.79070752323569],[-79.89639327491942,32.67742136191606],[-79.9966175657361,32.60578730603082],[-80.21080292089816,32.56160089518327],[-80.48607197307832,32.43103098955891],[-80.46039239990652,32.318685434183294],[-80.78056151538149,32.24812382552242],[-80.89291442693072,32.06817379146895],[-81.10487578287582,32.1054460207813],[-81.12404819885023,32.276644539432944],[-81.27430239616265,32.554813996172946],[-81.4121052853809,32.62560903383551],[-81.43233129190932,32.841681610154154],[-81.52960073212071,33.043927843759924],[-81.7042792389254,33.12293884666464],[-81.94033579330024,33.40816328831903],[-81.91663808726508,33.451332889480575],[-82.19218765831877,33.62383992636428],[-82.26621791004804,33.76159572571068],[-82.57661476332817,33.95928781440575],[-82.73578075774043,34.1697961706528],[-82.76416999299886,34.28096017949701],[-82.90505501534729,34.4779853429884],[-83.05499481394438,34.49006158983707],[-83.16487890038628,34.59893736245543],[-83.33979000732802,34.67769266062149],[-83.3226905817956,34.78724432054235],[-83.12563651165021,34.940790457344654],[-83.10615694952598,35.000366708619254]]]},{"type":"Polygon","coordinates":[[[-94.6172571101314,36.48941414390314],[-93.85751984120861,36.48978635592647],[-92.85227571782123,36.4898845245812],[-91.13395634779509,36.488015693858614],[-90.15025944115787,36.491872919026804],[-90.05215694018834,36.38261503981359],[-90.06618775344486,36.27233827875277],[-90.31533969553617,36.0917233916572],[-90.37906218671498,35.98965643115784],[-89.72183635694988,35.99995092987422],[-89.70151839825145,35.84211313922901],[-89.95112155352624,35.73434540321012],[-89.8934872802779,35.65605053934655],[-90.0331400399403,35.55249498977405],[-89.99965364982981,35.445537002695545],[-90.10643819698429,35.314772417491],[-90.06462860727001,35.14747463940068],[-90.30544833585468,35.00078875612853],[-90.2429391988875,34.9208271491002],[-90.45200553789287,34.825315834379126],[-90.46632614294599,34.67214004465473],[-90.58809526752702,34.627916127682624],[-90.53071996267182,34.55575170204166],[-90.6573464930104,34.36601433081788],[-90.75541796336032,34.37226909873513],[-90.8864503236447,34.04081809955218],[-91.06980548901421,34.00620118988912],[-91.01857196746626,33.93641342996932],[-91.14300262818129,33.77192855941624],[-91.16813338935933,33.57735590275974],[-91.09211028803706,33.225816125948825],[-91.1622413533262,33.01316261623283],[-92.06344167406941,33.01015155824476],[-93.23254316568021,33.01937490483775],[-94.03893173345088,33.02342240624279],[-94.03611649473187,33.55603470703363],[-94.15970995036561,33.593893979720846],[-94.37095894896446,33.547802475323095],[-94.47669125246995,33.63208184543019],[-94.4616914446558,34.196765198170155],[-94.4285519861974,35.40054628233173],[-94.54241726487386,36.106835821453075],[-94.6172571101314,36.48941414390314]]]},{"type":"MultiPolygon","coordinates":[[[[-94.03893173345088,33.02342240624279],[-93.23254316568021,33.01937490483775],[-92.06344167406941,33.01015155824476],[-91.1622413533262,33.01316261623283],[-91.20927014820943,32.93597806834646],[-91.07963556451706,32.877290826192585],[-91.15645023156188,32.76281109980439],[-91.11779193337043,32.498709288992956],[-90.98755564576003,32.453106452099185],[-90.97732476240408,32.223554153895506],[-91.10882040621313,32.13514351525161],[-91.2015421252147,31.91444887892656],[-91.33484640345252,31.843478432786476],[-91.42357801992475,31.562746489235856],[-91.5029570387256,31.534880474775704],[-91.51707814642286,31.283069638556398],[-91.63421422854113,31.277694036992386],[-91.62011389426368,31.127694404729745],[-91.55208130700395,31.05815981115066],[-91.63229742727802,31.001365022361362],[-90.56025489606638,31.001706307373155],[-89.7327174846088,31.00744500344956],[-89.8417855020175,30.679519838994544],[-89.69568148171628,30.478246070817036],[-89.57388396852164,30.194935322183383],[-89.7285604694644,30.18101288297735],[-89.9435365614844,30.269853495148553],[-90.07556112453605,30.368978763268636],[-90.2397510228886,30.380950883998047],[-90.42453054032237,30.185877230476187],[-90.39556747171912,30.092080059615952],[-90.11154648970482,30.04161033682542],[-89.99054841644673,30.0536639971129],[-89.89122587854447,30.15609141011864],[-89.71684016817068,30.05522630333416],[-89.84896336611344,30.010685501052834],[-89.71220220432417,29.89752776194696],[-89.58586287558022,29.89815697380993],[-89.57437833446997,30.00896001210736],[-89.45362358478509,29.9857329975745],[-89.40220248081036,29.8459451847813],[-89.77177824838262,29.610246855339142],[-89.5446296576087,29.47168529596339],[-89.53707636963898,29.401453316405437],[-89.38452191756356,29.397938515937906],[-89.33705848678947,29.340893306421982],[-89.19340039421014,29.349047780269323],[-89.1299377002891,29.29088733339246],[-89.05775343370104,29.085278758607213],[-89.15402388481597,29.057217650134554],[-89.31909051473191,29.180188628430454],[-89.61959212302757,29.27957488530121],[-89.6107185055048,29.33175813030411],[-89.96673871007832,29.472678275791264],[-90.15179361778571,29.595307658251137],[-90.17413348814326,29.49594181217192],[-90.03608390808922,29.447157274784182],[-90.11163968517175,29.321725449203036],[-90.07780237449813,29.17644195308241],[-90.22776263569081,29.09867419532008],[-90.28409911414323,29.245534761813204],[-90.45051601634701,29.352441980933058],[-90.63811999361882,29.162571525131973],[-90.77268943010769,29.160625609998704],[-90.93652763083651,29.34351697380317],[-91.07838568845763,29.3600181662882],[-91.2627251305764,29.489587632302996],[-91.43302484914386,29.55258186229543],[-91.54786533886268,29.531685925929036],[-91.54849045820653,29.64212944419279],[-91.64354729608964,29.64396455048571],[-91.61576779437534,29.769138081126236],[-91.86325625695638,29.725839539710545],[-91.82750349192467,29.839041623074174],[-92.13715125879457,29.73074160055009],[-92.05975721537273,29.60701485312288],[-92.29737405561129,29.541571483558116],[-92.60742547955647,29.588626491285304],[-93.23365731515632,29.788993429752516],[-93.72199166736193,29.75879359151181],[-93.79145430513024,29.850520103111815],[-93.76036752993039,30.006176425656435],[-93.71264388746623,30.06073100056444],[-93.69937687296712,30.2975935221848],[-93.75934709396161,30.34107715943339],[-93.6967413424609,30.442835730485996],[-93.73547936706903,30.545719692491268],[-93.55085520994953,30.82854275789769],[-93.50738887525011,31.039099809941817],[-93.55076455288052,31.191116639695984],[-93.68176671140992,31.31286374756025],[-93.70597743284759,31.520746934108978],[-93.83280517007533,31.590360114415887],[-93.79245262077418,31.711568045837723],[-93.88145154608989,31.87158880690064],[-94.03525561520455,31.994679245311474],[-94.03893173345088,33.02342240624279]]],[[[-92.01636775786783,29.59647837773831],[-91.90254894741473,29.650930898688628],[-91.76984725376363,29.578615464272715],[-91.84908883644786,29.48708295880039],[-92.01636775786783,29.59647837773831]]],[[[-91.3413189037475,29.34191089316859],[-91.22655373710202,29.38139950650409],[-91.19505905689566,29.273672954696544],[-91.2761625285612,29.254027930470365],[-91.3413189037475,29.34191089316859]]],[[[-90.93457446313772,29.259094210114917],[-90.96202532002584,29.18579947213754],[-91.12256168669326,29.22708521940505],[-91.12751342760662,29.293514368036213],[-90.93457446313772,29.259094210114917]]]]},{"type":"MultiPolygon","coordinates":[[[[-87.41881665695448,30.481700778598828],[-87.39864494105937,30.668015353329107],[-87.52660288701544,30.748491685293256],[-87.6257115778429,30.876901984121673],[-87.59858024827001,31.00263075045686],[-86.38391974598281,30.99153831412108],[-85.00160717777958,31.00125338465638],[-84.86300370893592,30.712664529660927],[-84.28166328535629,30.69041914987131],[-83.13244040238547,30.621341416115996],[-82.2210395554534,30.567076011356114],[-82.16463920262036,30.361291820877184],[-82.05276682534092,30.363794474022257],[-82.00580164581812,30.570990531791924],[-82.03188119797838,30.757532785275515],[-81.94380500621307,30.82424944632554],[-81.71676883020471,30.74536888599212],[-81.5285954747355,30.72145267051863],[-81.51811743430741,30.556212859698874],[-81.4575287248861,30.454764232214202],[-81.43276768913752,30.246781737321882],[-81.30275788878753,29.91305203385634],[-81.3164898963446,29.829240298813215],[-81.10988031210536,29.430239266997866],[-81.09705456441417,29.351799300019835],[-80.78566240012438,28.78519401741687],[-80.85070496183604,28.785699883861945],[-80.74718987121835,28.398992365036655],[-80.40137708277092,27.703585559499466],[-80.22127329432841,27.202842274903936],[-80.14796715946235,27.10906934833416],[-80.05091078926516,26.79719773765942],[-80.08469562244683,26.326377554125934],[-80.12778083482813,25.977536456945302],[-80.19309883861747,25.76003237960497],[-80.30145584558494,25.61375175933331],[-80.30197564731661,25.401200769811364],[-80.42080712023345,25.192219441234712],[-80.5518761059737,25.212318683278646],[-80.69382492427191,25.152299041230528],[-80.85680115758859,25.185631055303503],[-80.97587699015943,25.1305013519497],[-81.11901616167576,25.13418876347663],[-81.18378385115417,25.268879576829896],[-81.14056923228237,25.32076505221413],[-81.01156064860253,25.214429697885592],[-80.97428163296101,25.32245997677634],[-81.14332282419446,25.39682736919425],[-81.25837477800225,25.681100067036155],[-81.25620714158019,25.80310282783503],[-81.53074218232561,25.91465837160928],[-81.71829274963275,25.92358156559779],[-81.7056956649716,26.000171972955897],[-81.79471712504447,26.111162438268],[-81.86421234755359,26.439553994490044],[-82.02147293759141,26.524679894405534],[-82.0836601124535,26.715790694322795],[-82.05176752542025,26.8667090712248],[-82.17649533410548,26.91369326283008],[-82.2898406038341,26.849885916634687],[-82.3800366686971,26.947295849401023],[-82.53274026460205,27.331801851962474],[-82.68592537905354,27.473844642788208],[-82.57557163719012,27.512324786888044],[-82.55249982755942,27.64401407419649],[-82.40437954223937,27.79162787142299],[-82.39881770515359,27.906219390928282],[-82.53899534334353,27.935728111478895],[-82.64556526636264,28.028847063854855],[-82.7254850157271,27.940562775263132],[-82.62365309015466,27.848527045351744],[-82.64461911738641,27.71572505908029],[-82.72816287013354,27.7177732353874],[-82.84428556163239,27.850641323613175],[-82.77914410600945,28.17302744475976],[-82.67347593590478,28.428510617530527],[-82.63607575061503,28.69274893198587],[-82.681380662478,28.80838223072419],[-82.6366191749887,28.88470791944079],[-82.75532222569177,29.008660325263772],[-82.80215696264328,29.155132361461135],[-83.03674777352637,29.1793877379808],[-83.23432781008414,29.433937505569034],[-83.38003128155246,29.51987476035015],[-83.40497383865522,29.669602576817873],[-83.55044823266115,29.73732314834809],[-83.65418271338586,29.910961844473245],[-83.97173831507136,30.07748313181649],[-84.23307130358312,30.10811170028755],[-84.35392489537523,30.069624407230275],[-84.34691114647623,29.910168724629507],[-84.46453786465197,29.92962725431372],[-84.8580307283664,29.746860634636214],[-85.306589421054,29.70171035783094],[-85.300524152313,29.8097964814762],[-85.38479259176778,29.92380147564702],[-85.6284974945247,30.09259126187709],[-85.98701325508986,30.274430433836606],[-86.21960831535375,30.487854217814945],[-86.38787912871676,30.462167599293792],[-86.45263909939331,30.501237117950268],[-86.61023579403899,30.423651606798668],[-86.79034761210761,30.417963316052628],[-87.01439987544455,30.51443455962442],[-87.16010256985227,30.465033191539135],[-87.27389760225127,30.35738460481094],[-87.4240801027731,30.323671520223883],[-87.41881665695448,30.481700778598828]]],[[[-80.7258997579159,28.784365981650552],[-80.59912905693557,28.603922824945712],[-80.780445267117,28.618960605120762],[-80.7258997579159,28.784365981650552]]]]},{"type":"MultiPolygon","coordinates":[[[[-88.49752750773015,48.17379529374142],[-88.62532708873769,48.03316768566495],[-88.90154762571014,47.96024852697347],[-89.13988485292107,47.824076014484305],[-89.15609899922359,47.93922810550032],[-88.49752750773015,48.17379529374142]]],[[[-88.50068113043476,47.29018021681243],[-88.21139178121808,47.44783498378631],[-87.78812040151567,47.470793031746425],[-87.91704216162542,47.35800703842753],[-88.22227969520617,47.200752302246165],[-88.41284339266296,46.98809454459894],[-88.4706642122573,47.111472599036716],[-88.59426201943036,47.13476504207138],[-88.59563228807743,47.2435929477573],[-88.50068113043476,47.29018021681243]]],[[[-87.6728141416783,45.14067261836543],[-87.73619995840481,45.19907234810044],[-87.64536204149323,45.34816919136786],[-87.86209605178738,45.370165186511635],[-87.78938488631422,45.49906762371468],[-87.77747373893922,45.6841018098063],[-87.87362882245834,45.750699373369656],[-88.12994951113464,45.8194019422714],[-88.06542105271032,45.87364211846407],[-88.18019393815767,45.953516642902116],[-88.54835794204728,46.019300209593844],[-88.80439717937733,46.026804646354364],[-89.09980613977237,46.14564280199228],[-90.11165937070675,46.34042899489933],[-90.21152579921902,46.50629501294776],[-90.40819983493111,46.56861066182765],[-90.01886460800957,46.678633790311395],[-89.79124439326063,46.82471294467369],[-89.38671809801134,46.850208406289326],[-89.1251876843053,46.9966066217305],[-88.99487571099328,46.997103318860596],[-88.8848320163059,47.10455484302278],[-88.62950005952624,47.22581276534268],[-88.61810436234362,47.13111441141245],[-88.44116409117723,46.990734633860626],[-88.44661688076,46.799396776838535],[-88.1891883627004,46.900958181717044],[-87.90065410916252,46.909761863786585],[-87.66376620356283,46.83685156358584],[-87.37153889185771,46.50799118080692],[-87.00640195340438,46.536293644299306],[-86.8713827024411,46.444359709325404],[-86.75949571642255,46.486631494679514],[-86.63822033614136,46.42226373238552],[-86.46239203868144,46.56108555525539],[-86.14810910538316,46.673053096555265],[-85.85753646650161,46.69481514465696],[-85.50385060374906,46.67417460220497],[-85.23009474756077,46.75678531239785],[-85.02697152337142,46.694339790791105],[-85.01663972574666,46.476444230324766],[-84.80365301244902,46.44405422090486],[-84.629814818968,46.48294299526775],[-84.57266688204189,46.407926342823615],[-84.31161404977539,46.48866915476662],[-84.06198100356985,46.0944707200351],[-83.90646071843278,45.96023961572777],[-84.35448510425766,45.99919003689759],[-84.50163489270295,45.9783425891121],[-84.68902263991416,46.03591816838376],[-84.73173222120552,45.855679689438716],[-85.06162972085392,46.02475165227159],[-85.50954630247273,46.10191143782711],[-85.65538125259313,45.972870683838785],[-86.2593192716265,45.946929655679966],[-86.34379560069152,45.83439615524928],[-86.76146919130478,45.826067775241555],[-86.90162413932546,45.71477814160172],[-87.12375939418314,45.69624674881126],[-87.33222682668861,45.42394270082812],[-87.58386417117985,45.16273321314638],[-87.6728141416783,45.14067261836543]]],[[[-83.8546801462284,46.0140316351753],[-83.80110528931418,45.98841246551349],[-83.58949806578265,46.088518435904106],[-83.47318939778224,45.987547804291296],[-83.51615934617578,45.925714761842784],[-83.80488107853239,45.93676451165007],[-83.8546801462284,46.0140316351753]]],[[[-86.83482961680417,41.765504758721974],[-86.61759222665884,41.907448085792],[-86.49883343480934,42.12644676147406],[-86.37427782275118,42.24942141785675],[-86.28498076518854,42.42232475564214],[-86.2178547486189,42.774825238364365],[-86.27383683563755,43.12104505114962],[-86.54130124664867,43.66318706762267],[-86.42881416263731,43.820123830609994],[-86.5186023224938,44.05361924507925],[-86.27195438045258,44.351228478441186],[-86.2586269624435,44.70073095779327],[-86.10848455824818,44.73444202202279],[-86.0674543603072,44.89825691093387],[-85.79575657499755,44.985974877766495],[-85.61021507194775,45.196527733683425],[-85.56551466142093,45.18056027821669],[-85.65300624460123,44.958362236863216],[-85.63803953956828,44.77843572184365],[-85.52608101217128,44.76316233689725],[-85.38486952076633,45.010603243370085],[-85.39024475970207,45.21159307360746],[-85.30547496075366,45.320383783993066],[-85.08181568285985,45.46465047042767],[-85.12044693934273,45.56977936048183],[-84.97203784650283,45.7377452034647],[-84.72418582317304,45.7803045530417],[-84.46527503613312,45.653637460140246],[-84.20556030220521,45.630905433204184],[-84.10590761715964,45.49874949510851],[-83.92289218268074,45.4917735631583],[-83.59236308818356,45.34950190208634],[-83.4958321145543,45.360801917208136],[-83.31270747716027,45.09862017131428],[-83.44444100511839,45.05277359641498],[-83.42935572063918,44.92629688335845],[-83.31972438610568,44.86064660846017],[-83.28081219631696,44.703183827256446],[-83.35696294279239,44.33513368864551],[-83.52915050416492,44.26127413122619],[-83.59840447526238,44.07049337484416],[-83.9183762173471,43.91699764337223],[-83.93812174140977,43.698283734494936],[-83.699164678867,43.599642264299135],[-83.49424799883245,43.70284155749245],[-83.32602582946245,43.940459433811796],[-82.94015406520536,44.06995953421779],[-82.72790219220711,43.97250629327449],[-82.61848776118671,43.78786607690276],[-82.50382060778384,43.17225349954249],[-82.419835847249,42.97246505678364],[-82.4719527312774,42.898682013930554],[-82.51817954782615,42.63405206093708],[-82.72980583524419,42.6812267877994],[-82.88813814724983,42.49575599726343],[-82.92938908220285,42.363040471933786],[-83.10758850235172,42.29270576496564],[-83.19006623157537,42.03397965932629],[-83.48269098387102,41.725129933683874],[-84.7903774502834,41.69749475802344],[-84.78847779615735,41.76095947230202],[-85.65945885214508,41.76262751056776],[-86.83482961680417,41.765504758721974]]]]},{"type":"MultiPolygon","coordinates":[[[[-161.3337851273787,58.733248100982365],[-161.34946900753357,58.66503238644324],[-161.76527216149904,58.55169949788004],[-161.89360941663185,58.651981135768374],[-161.77279193225522,58.78226415062234],[-161.85502177915018,59.113376299583344],[-161.99446260848725,59.14337462011065],[-162.051834701492,59.271549676796],[-161.96058893137797,59.379211162730016],[-161.70750672042286,59.49588536003269],[-162.23838897351274,60.059779892664174],[-162.19978646827178,60.143674462366356],[-162.45171329373537,60.18672600212203],[-162.5114615344209,59.9995050639178],[-162.75395727909338,60.002006473765924],[-162.81673097928993,59.93477488056393],[-163.3664458656596,59.81894192905763],[-164.1103187173501,59.8347714821714],[-164.22088718695696,59.94504788060394],[-164.11395479107395,60.00172118892076],[-164.42700851812452,60.09059992886499],[-164.66397780787017,60.25921093935497],[-165.07840509835228,60.39087271871848],[-164.98591292304945,60.54336966831012],[-165.25088721749304,60.49642464055866],[-165.42758354343772,60.554474485811326],[-165.0067632200571,60.70031093824887],[-165.0337144269849,60.78475965576088],[-164.84149258583386,60.86614416434035],[-164.27179900542004,60.78309928449297],[-164.22064790409883,60.688102228471365],[-163.94733196781343,60.7800494770834],[-163.80676403799038,60.74394330489468],[-163.80175204897915,60.58061423426541],[-163.4536970262929,60.67783938202309],[-163.47146171929973,60.75062462727263],[-163.9600910955099,60.85477804726424],[-164.5598187930423,60.85004113770241],[-164.63928841710813,60.92808884449385],[-165.19287187373064,60.959753182929354],[-165.04843941436982,61.05689161072502],[-165.34369793583437,61.15641240268618],[-165.3753696822475,61.069476314220736],[-165.60174520134095,61.112251168601794],[-165.61121425449298,61.28001818768131],[-165.87092012993014,61.326401297017036],[-165.7798336054333,61.45668280955386],[-165.8931807919114,61.553894281045125],[-166.13011039976283,61.496673300423396],[-166.2001268227127,61.58806489890846],[-166.00207821861824,61.72639748442992],[-166.10096296058322,61.81528705141839],[-165.59180783967244,61.850299174098296],[-165.75877837164566,61.99196053178168],[-165.70571647832992,62.11280412539417],[-165.08324970851208,62.528920952818396],[-164.79492935385304,62.610872508413514],[-164.8802132560888,62.83475687485865],[-164.59023211572952,63.13282483298978],[-164.147213347019,63.25950482509705],[-163.72773619877285,63.21394596983277],[-163.3441181174473,63.021168892987106],[-163.06384432882143,63.05922678236151],[-162.68275014029712,63.22978733426752],[-162.27553645869813,63.488684341432965],[-162.15718344788954,63.425080481504466],[-161.15412483331778,63.511764025277664],[-160.7888700924788,63.74011058446351],[-160.77499603824558,63.85428135156052],[-160.943322592755,64.06705328531066],[-160.96390832653327,64.23705725461699],[-161.25312240448068,64.39206146791321],[-161.54088467422292,64.38567553216811],[-161.40286363819462,64.53401847124965],[-161.0850418673545,64.54957367017056],[-160.82005358582026,64.61485313175456],[-160.7842371536241,64.71570254191509],[-161.19732230505255,64.9343000989198],[-161.3775887581789,64.78735203540408],[-161.7178611046088,64.7876176865183],[-161.89036767525616,64.71067656581323],[-162.11674521470715,64.71511290833826],[-162.5789579498725,64.52010489053436],[-162.82979253896866,64.49508716577037],[-163.05314808977926,64.55119384150387],[-163.1570277772265,64.65591451572729],[-163.3906420301622,64.59231371223711],[-163.03981378183292,64.51536627143923],[-163.17840937646258,64.40675324890887],[-163.5662057125887,64.56563903527183],[-164.36008816359146,64.57896660869304],[-165.03123083772633,64.44310398796776],[-166.23955591320689,64.59532015966568],[-166.49262672727332,64.73420456181519],[-166.3898792171079,64.8905961390915],[-166.70044199872635,64.99225845823884],[-166.9218316898485,65.13084462453332],[-166.5457275772267,65.13115063099426],[-166.3765483800322,65.2683811373808],[-166.62961727734918,65.36338036917206],[-167.4599197812156,65.4180784412693],[-168.06750454560495,65.57949304181723],[-167.35638583392756,65.88674160820881],[-167.04888011228422,65.87533306362441],[-166.7174966655687,66.06145622242897],[-166.26974492440334,66.17842534012814],[-165.8094307036752,66.10231966316702],[-165.87914676680444,66.2217682258016],[-165.76919989386673,66.31704885713506],[-165.16391481439595,66.44261278301677],[-165.0360995885685,66.3934497135129],[-164.72028009565656,66.54873237352106],[-163.93662122364017,66.60772660641263],[-163.75748705140376,66.51737134773644],[-163.89691663926428,66.3918002728973],[-163.92467583379513,66.20734349462921],[-163.65912553023708,66.0698442288861],[-162.7602248944124,66.10652661740545],[-162.66716717441108,65.99679809849395],[-162.1546548409207,66.07681031806882],[-161.84102235914156,66.01237624660435],[-161.53330677933445,66.2671017852984],[-161.00497240431605,66.25101077719759],[-161.12938576248195,66.33905391798575],[-161.87524638696954,66.4368235780019],[-161.90888922527913,66.5346041686704],[-162.22666079800504,66.70987780028011],[-162.50391767478638,66.73737041122402],[-162.63417551287716,66.8620956815113],[-162.3269678198727,66.95655495979955],[-162.01753296760486,66.77627519303509],[-162.07806489979896,66.65737399188117],[-161.57524857295738,66.44654978640568],[-161.188882494556,66.53794071143824],[-160.82524383253119,66.37766367579225],[-160.23329202492593,66.3990837136256],[-160.32413382714049,66.60241073490607],[-160.54499050650088,66.58629216705631],[-160.84136001739512,66.66212478492557],[-161.14305855802192,66.64684559792676],[-161.25217578926808,66.54822438311038],[-161.5094233040139,66.53322395364776],[-161.90058793878404,66.72766585690871],[-161.8031014396474,66.89907014120499],[-161.51977929412507,66.98655260687434],[-161.87059055072945,67.05127662554753],[-162.45502082624114,66.9882156719523],[-163.7247441010632,67.11012642877714],[-163.82536479638964,67.35402295467593],[-164.0229037005401,67.54625142674398],[-164.7098654115687,67.82763066176733],[-165.36434531641956,68.0384502566833],[-165.922125936317,68.13009958026456],[-166.29077410075917,68.29148770894834],[-166.3696520708906,68.43843152453283],[-166.22886273060303,68.5717843431556],[-166.2350102123546,68.874281080422],[-164.3277911942264,68.92987634667818],[-163.5639397520998,69.14434522534808],[-163.18733334751167,69.41823991636204],[-162.94431158462277,69.6921422225698],[-162.96599623748955,69.77771710809508],[-161.95581912625107,70.30302224190757],[-161.6166477192672,70.25499337004305],[-160.95250931389214,70.28942901737213],[-160.97918766894423,70.32388372858773],[-160.15371527010657,70.60418124346366],[-159.94173526470726,70.6322387774576],[-159.6715120295761,70.79753422581571],[-159.28124324205987,70.7561613959579],[-157.8838865735888,70.8558965012302],[-157.2787415204366,71.04843745526412],[-156.8198844955337,71.29984396095566],[-156.6048595005005,71.3495767194812],[-156.45042943137332,71.26319773165582],[-155.64791622018464,71.18540526336669],[-155.55040309377176,71.11735081480232],[-155.98616323588885,70.89818973345663],[-155.89786242180855,70.82735770770992],[-155.58670140714275,70.83929610400966],[-155.29065380654956,71.08514398446584],[-155.0034163117268,71.11663027241784],[-154.60586154508437,71.01432211231086],[-154.80893726496956,70.87763995168174],[-154.197785585249,70.77599369178664],[-153.9183502450014,70.8887805657742],[-153.22583332780403,70.92822410959539],[-152.21882020007803,70.810747623134],[-152.4971166285187,70.64351413385663],[-151.7440246263624,70.55963800639248],[-151.9692847526828,70.44323355272314],[-151.22343417817882,70.37075907990616],[-151.2006823620997,70.43437558002029],[-150.78317433719647,70.50189530728962],[-150.37202660503883,70.48579445642133],[-149.4978606367067,70.52248663590413],[-148.61027384768235,70.39833955050096],[-148.50805012815965,70.31110253237044],[-148.22581939014015,70.35888694097287],[-147.86162735736607,70.30972962171735],[-147.69271868086548,70.20889963807161],[-145.84233418522481,70.17032489979576],[-145.61061077972846,70.0647780029474],[-144.97058580780498,69.96867104538093],[-143.777962640285,70.09975759269057],[-143.2833491204596,70.11815289626942],[-142.59550301086975,70.00400585542248],[-142.2718690858253,69.84843780696104],[-141.73378182332283,69.77537649798535],[-141.39099941577018,69.64092657341547],[-141.00566004162636,69.64219416645638],[-141.0047233209853,68.42791514911556],[-141.00243472213117,65.84008963590843],[-140.99891220286176,61.89454137789632],[-140.99738491617114,60.306829212402924],[-140.5231905801372,60.22186514830663],[-140.45263834800747,60.30936724770693],[-139.9811752763446,60.18744752878327],[-139.67841599620635,60.34023427017151],[-139.06978681057797,60.35191069344383],[-139.1906029998536,60.088577395557394],[-138.6919948705474,59.90662596424443],[-138.61753526693929,59.773859204719784],[-137.59264850231156,59.238252993077914],[-137.4674320779264,58.90572208688892],[-136.81078655701103,59.16487821785961],[-136.58577483105972,59.16294421765541],[-136.4646442948728,59.28907938667996],[-136.46548735381054,59.46937744027034],[-136.23573809664896,59.52550799766601],[-136.3457273452909,59.60245709619316],[-135.475441033276,59.8016131152386],[-135.01629577069772,59.567172898698146],[-135.09349876082214,59.4266123250487],[-134.95374876497772,59.27966348447239],[-134.68985790021486,59.24300575467581],[-134.46319144963596,59.126342384417384],[-134.24732230778017,58.8566295226827],[-133.82869225918682,58.7257894589927],[-133.4317262972566,58.45884661105061],[-133.36284282864918,58.28022949493179],[-133.13868312373444,58.13550522341686],[-132.22834819671777,57.20438542789435],[-132.33864194950354,57.08799490951162],[-132.02918963927442,57.03606141178283],[-132.10474862820737,56.866331278628955],[-131.86307739662652,56.79939885375469],[-131.82583883993982,56.59660997283585],[-131.55947599002326,56.60189771474898],[-131.05670022574455,56.39770271678778],[-130.77615291179046,56.365766096320996],[-130.62890536912278,56.25827209284647],[-130.46365198564467,56.234944423064995],[-130.4158912514883,56.12855400104254],[-130.09029794226032,56.1177520817599],[-130.0167788927922,55.90888762309621],[-130.17641464623404,55.754136524336666],[-130.1455885489606,55.54108277661201],[-129.99223533040117,55.281382288794944],[-130.103073077405,55.22747707752125],[-130.3613868746945,54.90771182633772],[-130.68778366457408,54.761603454497184],[-130.92776950353596,54.80909952181611],[-130.9303000790583,55.08716257305912],[-131.06751380093604,55.19104101720941],[-130.86585973930505,55.3082667203159],[-130.8875384347073,55.704923930171084],[-131.20281263830014,55.97351134914905],[-131.41142444866352,56.005187188081315],[-131.91724613504883,55.85796725696664],[-131.7541900717074,55.80740382066877],[-131.96417520715616,55.49824228651299],[-132.17752517037832,55.58990855001514],[-132.17584873985817,55.799638239745455],[-132.04947775884614,55.805468214539346],[-132.06281615931158,55.93686527526135],[-131.94584709341643,55.968247333485984],[-131.96195659555931,56.16519188989201],[-131.49196108052956,56.22046783604913],[-131.90863946374128,56.228523623201355],[-131.97196384087704,56.356877352018714],[-132.15918462366912,56.37687547257767],[-132.3477859323081,56.52714940722911],[-132.3125114739725,56.63743445693624],[-132.77060164367964,56.84354040230409],[-132.88617977111596,57.016873454596585],[-133.29811430302456,57.096315881541706],[-133.55479611765975,57.17881920196084],[-133.4339452196777,57.34659129783623],[-133.49698379392788,57.53769955935555],[-133.66395572461016,57.63270982540722],[-133.54701136924183,57.76549627046684],[-133.69310502873518,57.78716268831174],[-134.17646981943787,58.19632679199542],[-134.51178633243532,58.3535561960015],[-134.76320345795494,58.38187938110966],[-134.9126210718345,58.656057906455686],[-135.14907144051716,58.84077095930686],[-135.16350041962076,58.992720236593605],[-135.39103495048846,58.95883832264203],[-135.16458923692159,58.6363278718008],[-135.22318255835197,58.592160524839755],[-135.09347948971947,58.43631998713091],[-135.08734454454543,58.23271006399107],[-135.34595450552837,58.26466181123737],[-135.47403988942145,58.371879336553434],[-135.84571024972016,58.46880723273283],[-135.82213884193314,58.59936149353727],[-136.0974215703797,58.85599725438141],[-136.29407270870638,58.662116958711955],[-136.12043183681158,58.55380061791545],[-136.03100449208975,58.38298373962232],[-136.27823398627766,58.309073776872616],[-136.31824297118925,58.399077700553356],[-136.67936027881078,58.29823792594416],[-136.95188392411708,58.39574063974512],[-137.0944164185276,58.38184835049004],[-137.62832729117494,58.59852263072671],[-137.92851387910682,58.79662764942011],[-137.9668175268443,58.90439719858039],[-138.2981474599871,59.076364178353],[-138.62755940037385,59.13914761770898],[-139.30031473425632,59.34359718071996],[-139.83748299309923,59.53303460655542],[-139.57251056360107,59.609975882672614],[-139.4714181924956,59.7074669405647],[-139.61946704004527,59.88496534845194],[-140.40505597515886,59.69771115205441],[-141.45032913162112,59.8809698583025],[-141.26095096960677,59.976542301790104],[-141.3867928759641,60.023759041728404],[-141.71758762157546,59.952061629502936],[-142.71905082714474,60.10949099710124],[-143.88893093346826,59.9900121291036],[-144.2525542614974,60.14501074756356],[-144.57612710957935,60.18526839186446],[-144.70084621518595,60.276921134512314],[-144.938378304016,60.30111937117648],[-144.79643767075603,60.451669939398506],[-144.884181021568,60.478063061409465],[-145.35139984008404,60.35165825235966],[-145.65561812918892,60.466943997797415],[-145.94228132443052,60.46749845643148],[-145.84920060343566,60.69610564173972],[-146.04283296497238,60.798085882277064],[-146.48780935652908,60.678053021881716],[-146.68863517517758,60.74458531235539],[-146.0918574586708,60.83369302615391],[-146.2330840250512,60.89223480256505],[-146.3652785053522,60.81999811028908],[-146.62588867210172,60.819174218845916],[-146.75621691188212,60.94918433002014],[-146.98730349032172,61.00278094463093],[-147.27459071702236,61.00138891828729],[-147.3648258421311,60.88391030786028],[-147.54623234675324,60.91029736879863],[-147.8673369395723,60.831966708343806],[-148.15069457086165,61.06581894903668],[-148.37372945466814,60.77411004035419],[-148.23235130966836,60.766890629418626],[-148.19956230553672,60.625481609211334],[-147.9390384443169,60.461680033938386],[-148.31565811073912,60.25126513217847],[-148.44375183508254,60.02659344794201],[-148.64573272839834,59.920555345191744],[-149.3924271907047,59.99692501553782],[-149.63018493793052,59.824155850214574],[-149.91796471743808,59.7141495062396],[-150.17795717282138,59.52997604426318],[-150.6018187559451,59.433290487380255],[-150.92345879531572,59.31689763781575],[-151.25794250657526,59.31354130590484],[-151.72544241380928,59.16014498638458],[-151.9740358047474,59.27043599355624],[-151.90126786204704,59.407427527908865],[-151.17237373392663,59.59716401846397],[-151.4732225328946,59.633552781687804],[-151.87130093476762,59.74326969649446],[-151.7210730021032,60.021332126088986],[-151.43416840003783,60.206074241006284],[-151.3061080892998,60.384968197911846],[-151.27752795615606,60.53858945057133],[-151.41114559702842,60.726925367116294],[-151.05417437389897,60.78721024584632],[-150.44112506040992,61.02971640313072],[-150.05580298881526,60.90498211894056],[-149.81746063300443,60.97387532670741],[-150.06639214890794,61.1538821379881],[-149.99804469669652,61.23972433235684],[-150.5010981824306,61.25222630480159],[-150.5899965561058,61.283889814372465],[-150.95278993161918,61.208329012298115],[-151.17029944838364,61.04943628419388],[-151.74528367173681,60.91582631031937],[-151.86975225300873,60.75276004158215],[-152.3241876477338,60.498296320503414],[-152.2447414390938,60.39329890910134],[-152.62356640347474,60.21938534074295],[-152.58212726444646,60.081056588720415],[-152.7093839391207,59.92160722621245],[-153.01027371508385,59.82938096104403],[-153.0466783821478,59.706327717933505],[-153.22826117591615,59.643249772613345],[-153.4510340348912,59.78851487829997],[-153.5910943369318,59.555461041462856],[-153.76715342138743,59.51988534263794],[-153.74935060060756,59.43515848923821],[-154.11406616500415,59.3032000799449],[-154.1734985046572,59.121804505975064],[-153.70488392990666,59.06848980894688],[-153.42902208410328,58.981826675965216],[-153.36483252770492,58.84294170397127],[-153.44985399067693,58.71377278678938],[-153.6106832573833,58.63404927112629],[-153.89818531543546,58.61348358551128],[-154.1053870198454,58.48125558799676],[-154.0026467104415,58.37736585056587],[-154.35652145072183,58.28708752088825],[-154.33554449283776,58.07652109231299],[-154.7849154728637,58.00152428081596],[-155.03626359540277,58.019016536379404],[-155.08239260592507,57.881791987457405],[-155.32986402497713,57.835119707973554],[-155.3132099069677,57.73373003348576],[-155.60542478570335,57.790126967252206],[-155.58986331849366,57.66844948401694],[-155.77211692276865,57.642896468113484],[-155.73876118244561,57.548449156558355],[-156.03626483917517,57.57289460209871],[-156.5479083671202,57.31510122818937],[-156.34510865915712,57.178995439302994],[-156.50928343073014,57.04815480576856],[-156.78177858381474,57.044265772920156],[-156.81567609078218,56.89703853743592],[-156.94620424235075,56.90730552820735],[-157.2186931271466,56.77062973947508],[-157.60233291436467,56.71812157953685],[-157.48315482062,56.615073398726565],[-157.85093055323404,56.55644516137361],[-157.87896974859802,56.466723051667394],[-158.42510963820632,56.443099891644984],[-158.45980290702352,56.34032326760942],[-158.339520195746,56.17227308765035],[-158.44203313722082,55.99282669246826],[-158.59729927174044,56.035326571008],[-158.67202639140817,55.954209164055854],[-158.85670789559933,56.01003956884704],[-158.929489359154,55.91364929498889],[-159.54562919802763,55.880302464960636],[-159.62399757182314,55.81307543051411],[-159.84316020729,55.85029880861727],[-160.04148005733495,55.78723692254933],[-160.06702359309918,55.695841179741116],[-160.36728980383967,55.601673040154495],[-160.5942443884859,55.60750705566346],[-160.90145021654496,55.518057124380434],[-161.24560615639916,55.3480367331936],[-161.5050936778101,55.35859056293138],[-161.37588974109755,55.571930786994116],[-161.56452451514602,55.62192241030471],[-161.71341745771423,55.51331249601673],[-161.70117491989896,55.40469905905407],[-161.9697783463251,55.10107361537647],[-162.36339761189575,55.10190641711442],[-162.64813561361987,55.29440313049866],[-162.7236627430686,55.218564503360824],[-162.60698927102248,55.1616203117218],[-162.73753715993007,54.94716531653448],[-162.87977773857835,54.93105441568255],[-162.91951620279605,55.018557810183836],[-163.18646148552799,55.13883466760492],[-163.2109010772119,55.01466385595168],[-163.04646806250227,54.93660941463512],[-163.36224844336445,54.81104838977963],[-163.3250678035938,55.12078168511864],[-162.88061411479504,55.185502077509064],[-162.89230727077208,55.26523035914378],[-162.49005854011654,55.37356949371764],[-162.50370403492775,55.44384483325659],[-161.78399906273432,55.89109272833439],[-160.87646435126524,55.989721817364774],[-160.7895431305591,55.87916474464658],[-160.57149557704108,55.92889739956404],[-160.36954555893277,56.26917534083024],[-159.83928003293235,56.54002918653345],[-159.211232051318,56.693362046105406],[-158.94817683751526,56.840043370622084],[-158.64262651114439,56.760329076078015],[-158.70205869538535,56.9764328384284],[-158.65097659704466,57.052545664346965],[-158.287372332902,57.32340013169866],[-158.05708467635856,57.36284937396419],[-157.9401463302588,57.49118087884863],[-157.6807120634004,57.566749503332936],[-157.70876281106518,57.64257979002043],[-157.6120951783799,58.08897245221121],[-157.46738339163846,58.211472842612885],[-157.55129376157268,58.39230934738915],[-157.07379935281463,58.76342949698503],[-157.11408880479576,58.87370579180949],[-158.20104173004947,58.60619014660338],[-158.3682591082706,58.74729746008501],[-158.5669035624266,58.8117404936483],[-158.914412259713,58.76812470429511],[-158.70632553509333,58.49145730567851],[-158.84048204158387,58.401725715833074],[-159.05883979769004,58.42423032303602],[-159.43190741654038,58.78200378352014],[-159.7649832494202,58.853397313250284],[-159.92135322441206,58.77033352492851],[-160.018038781295,58.88478258332536],[-160.25192894254474,58.89477506449183],[-160.32887130654674,59.05894724586289],[-160.83570633174742,58.836056636306225],[-160.8988800627365,58.884774398287135],[-161.2997300325233,58.80920789776844],[-161.3337851273787,58.733248100982365]]],[[[-166.1114398095184,60.40947021346325],[-166.06648395327315,60.32753134985779],[-165.6837037504814,60.293921044484975],[-165.7278504276307,60.065580805391946],[-165.5428481528274,59.97863150689645],[-165.61446894687853,59.901412353911724],[-166.11891979477232,59.81057163958201],[-166.10475703662735,59.75724248922682],[-167.1289292681392,59.99639625170732],[-167.3181121807289,60.070848758162015],[-167.45313386648203,60.20667884595052],[-166.8414354469293,60.20390385897014],[-166.81031126921297,60.27945766749917],[-166.49812349848557,60.37807095629753],[-166.3986659074525,60.34002441200776],[-166.1114398095184,60.40947021346325]]],[[[-164.178091403744,54.603270987079426],[-164.38837803870226,54.44186866408884],[-164.6472630791346,54.38993055580054],[-164.8553076870702,54.42436578869731],[-164.9536421147243,54.58630956750806],[-164.70613930242433,54.66743158501972],[-164.49001523289047,54.91550657293523],[-164.2214368796194,54.88662297172847],[-164.13782277698672,54.964953321359054],[-163.77061429860447,55.05522372501864],[-163.53199634530387,55.045514560143836],[-163.36197294948275,54.775495640144186],[-163.43838540996538,54.6574383785967],[-163.60195909926887,54.60993521412436],[-164.178091403744,54.603270987079426]]],[[[-166.6452193589258,53.52274191812767],[-166.75470885399932,53.44552084839349],[-166.88745970968387,53.47662264676479],[-167.1435656706167,53.415782117907796],[-167.50075882225107,53.255752498354134],[-167.66694752766116,53.23658199912918],[-167.84470521476575,53.30325172571947],[-167.69332417598758,53.383829749013024],[-167.3260717677799,53.40465834012816],[-167.16273218093062,53.46523104210127],[-167.16188321633237,53.59245829208113],[-167.03190895355343,53.750801327522936],[-167.16275140022924,53.852751469913365],[-166.75250500655372,54.00829952201557],[-166.26640775998703,53.90801482768891],[-166.53911821065952,53.78190623413659],[-166.2791174666299,53.677749913118774],[-166.5402136588774,53.62691113835131],[-166.6452193589258,53.52274191812767]]],[[[-167.79725302546822,53.494653871554505],[-167.85084342359428,53.37991963192057],[-168.28753153146977,53.23518696815125],[-168.47231198137624,53.045981365392265],[-168.77040408018976,53.0668018232732],[-168.79595911645075,53.14652559795649],[-168.62343229042398,53.2712942282248],[-168.43064500818252,53.33214035191805],[-168.35393928503265,53.47464860203811],[-168.0075234975662,53.56271199820568],[-167.79725302546822,53.494653871554505]]],[[[-174.16132958989115,52.41734654761921],[-173.99182552956535,52.32012611402912],[-174.10097135664128,52.102619291074696],[-174.37707776931487,52.096764968382274],[-174.41604533762174,52.03621340245724],[-174.70405362474725,52.049531651151355],[-174.72214846489737,52.00092138255227],[-175.0243506961996,52.02063509893473],[-174.90688887028136,52.11037331969722],[-174.57963063103003,52.099541664895945],[-174.44853294585192,52.31177576910868],[-174.16132958989115,52.41734654761921]]],[[[-176.9410841478184,51.58303264976323],[-176.9747232044331,51.65635992067738],[-176.7030363497758,51.85139404771715],[-176.77417728300966,51.943883581013985],[-176.55836548822552,51.98222178204577],[-176.42885321387024,51.83500381948459],[-176.50913714563194,51.75194464172233],[-176.80054533186552,51.602761648337335],[-176.9410841478184,51.58303264976323]]],[[[-177.91031482824766,51.590475284304716],[-178.10336506779325,51.663258975433074],[-177.95779100281544,51.76327123231635],[-178.21759836236586,51.875220279574144],[-177.94867685913758,51.91772886119251],[-177.7997581699618,51.787448229324355],[-177.91031482824766,51.590475284304716]]],[[[-171.08694572236232,63.43185603543015],[-171.45164305173702,63.31351043259917],[-171.73392010256782,63.369601826141036],[-171.8536267011228,63.507670211061374],[-171.63725946342785,63.69350217936029],[-171.4914005280372,63.595733918053185],[-171.32809461381356,63.632963512641076],[-170.91723822757368,63.570474941877556],[-170.65441359355046,63.67687707161293],[-170.30273948886529,63.69326833592628],[-170.0687995957377,63.594663439382316],[-170.0860033546055,63.48494253566463],[-169.17931408506,63.29802154284873],[-168.69289606788115,63.30219156080703],[-168.85259067071178,63.15441193885031],[-169.32793381312422,63.18217874857494],[-169.6562733580907,62.9432742671322],[-169.80794025155848,63.124379220440815],[-169.9802094042931,63.14198689540412],[-170.23989647486397,63.2816032368268],[-170.85942585203776,63.46103087894661],[-171.08694572236232,63.43185603543015]]],[[[-146.09897543729713,60.392221747709385],[-146.6042550462138,60.23749774246246],[-146.7261969890704,60.37415032298507],[-146.5828717374444,60.481943702003484],[-146.09897543729713,60.392221747709385]]],[[[-146.9398328069821,60.28582298523658],[-147.24086271287194,60.128542606055696],[-147.482391017108,59.945765262942025],[-147.47186500613938,59.86799434513328],[-147.80284142851707,59.92072862970365],[-147.19499826557904,60.24493628448482],[-147.195544694587,60.35271272358235],[-146.9398328069821,60.28582298523658]]],[[[-152.09321928611217,58.35956230452947],[-151.96461508476415,58.28038791168438],[-152.0824244121789,58.155653679298254],[-152.77471468670373,58.07150242058068],[-152.7891544928516,57.9917682850895],[-153.23358813348713,58.16845829094137],[-153.01497633037158,58.302903397735605],[-152.76219686222294,58.25734620020058],[-152.66022288997436,58.47651531117237],[-152.09321928611217,58.35956230452947]]],[[[-133.95757521807104,57.29993062245721],[-134.36199857869397,57.079938604319004],[-134.61423565854975,57.00910025847948],[-134.58341686564586,57.270493546893135],[-134.3428386992971,57.3279942693278],[-134.4703495245888,57.393274248952196],[-134.66259436673334,57.60716380304909],[-134.8054054632679,58.043821398345344],[-134.6876039064591,58.16243083914916],[-134.17091430244488,58.159383984569835],[-134.1795487407176,58.08327064061088],[-133.89370301321827,57.796881436933845],[-133.93840280209662,57.620763813913676],[-133.8420012867619,57.460209264028435],[-133.95757521807104,57.29993062245721]]],[[[-135.88778999750008,57.98768244869528],[-135.36176504655964,57.7968742879764],[-135.35871461750162,57.720198093128985],[-134.91705777698783,57.75298844416564],[-134.81344166849323,57.48104008271726],[-134.99008064736626,57.45020574860156],[-135.7048668260154,57.67381156472666],[-135.572351316082,57.58824963021125],[-135.54875410988336,57.45908433931212],[-135.68983816335128,57.362416188586444],[-135.84178723342188,57.38796765036871],[-136.12041272112103,57.61683929529826],[-136.22961299424242,57.78378952008802],[-136.4163008170768,57.82045382899761],[-136.27238945454866,58.10433960246898],[-136.11098428233592,58.21880026497066],[-135.96763618512855,58.1596378761671],[-135.796830548312,58.27714751721373],[-135.48428962944774,58.155208112755076],[-134.94316514791728,58.03548845958215],[-134.9190149854017,57.83937597965751],[-135.01233561090316,57.77660025910341],[-135.2362128801949,57.779649289452394],[-135.88778999750008,57.98768244869528]]],[[[-153.39281909016483,57.15781504695607],[-153.67339872983953,57.00893313864827],[-153.98200880999553,56.73780499055624],[-154.1517385805211,56.7453063190744],[-153.7756619758443,56.98948072184071],[-153.96566230437224,56.98807315428524],[-153.96705888947136,57.11586838375345],[-154.10341743026612,57.11559563548583],[-154.16343821200311,56.956138554176],[-154.2970298990517,56.906979162758915],[-154.53231177582086,56.98976885590804],[-154.60952854581976,57.259812382826425],[-154.7559703802621,57.300098622957094],[-154.73011389629568,57.421504912045926],[-154.51928440680817,57.57789415814047],[-154.21870825249974,57.66761186450333],[-153.99839634441804,57.63454715927383],[-153.88845076658131,57.40425831123748],[-153.8103543121888,57.39981160790456],[-153.9306282167796,57.81039104974962],[-153.643955800419,57.88927787837181],[-153.21528623259138,57.78759887832378],[-153.27807935930272,58.00455963489853],[-152.8191623971262,57.916207793839384],[-152.62133162901756,57.92787193955436],[-152.32855478006215,57.813406303864895],[-152.4482924610408,57.72173097465585],[-152.4374641735021,57.603944492822485],[-152.15356182273808,57.60366361132067],[-152.34746770960302,57.42337249947157],[-152.60527108169197,57.37919826257328],[-152.8405614543236,57.26809020209166],[-152.88221143579236,57.346426042950434],[-153.1642054811557,57.34782148836067],[-153.39281909016483,57.15781504695607]]],[[[-134.6553900825773,56.16266193601816],[-135.04843147408803,56.527941024755705],[-134.93898673770457,56.709594634645974],[-135.1900877031715,56.67460654904036],[-135.37063529681987,56.83267999626094],[-135.3667543454016,57.07991487806895],[-135.67430171749265,57.3460283433397],[-135.52676370957585,57.4355063524121],[-135.5159801807272,57.50686693477316],[-135.31456037696256,57.532420624129124],[-135.16761423019628,57.478254631320915],[-135.20206396822408,57.42436677440043],[-135.0039932438048,57.39937826711469],[-134.83619804332784,57.2477099231338],[-134.61814442873717,56.72075296571991],[-134.6553900825773,56.16266193601816]]],[[[-135.7020716872637,57.3165834971697],[-135.54788597779054,57.12907499474258],[-135.63094007875694,57.004082312003725],[-135.8395673785281,56.987685142029875],[-135.84873778139277,57.31629500047409],[-135.7020716872637,57.3165834971697]]],[[[-133.05339036300794,56.97714700891604],[-132.92951431633907,56.85993280630631],[-132.99144216017976,56.80686562897854],[-132.93311345378282,56.62963670570444],[-133.16563800874903,56.453257420481094],[-133.64928440621009,56.44324266357767],[-133.63677487037558,56.593523695382515],[-133.7086943665181,56.6774253622381],[-133.67452457751938,56.85882186868064],[-133.75814204741462,56.803267061379245],[-134.0197947186537,57.01438002257054],[-133.87477796153215,57.08576847550482],[-133.32701235755832,56.99660004737208],[-133.05339036300794,56.97714700891604]]],[[[-133.96505349379163,56.081284628200166],[-134.1939689131345,56.15543734467866],[-134.28258345247764,56.355728701052335],[-134.13617606772146,56.48657487761899],[-134.3081290085994,56.559914218874326],[-134.25313311507946,56.61241668036822],[-134.39507835889896,56.72102742352083],[-134.4014886943466,56.85243453422648],[-134.26536954001807,56.93659812230544],[-133.99531482342715,56.874097584808815],[-133.71950856335806,56.7663243057577],[-133.77759902297765,56.684087517121455],[-133.6931436745486,56.5993612853702],[-133.84536471582624,56.571581524635704],[-133.975081305313,56.3557286492483],[-133.96505349379163,56.081284628200166]]],[[[-132.80365329429122,56.78604066414618],[-132.53254970131388,56.57743346434231],[-132.9417225080762,56.50937492325883],[-132.88337105970592,56.636586062182424],[-132.96562302692573,56.79603842932467],[-132.80365329429122,56.78604066414618]]],[[[-132.33780474442224,56.47964790048604],[-132.16251075382505,56.35271054591086],[-132.00532051367276,56.33631508547032],[-131.92335020501537,56.19686135692742],[-132.057810283177,56.111031284703905],[-132.351410246515,56.27797332445543],[-132.33780474442224,56.47964790048604]]],[[[-132.70477057268377,56.45575587749897],[-132.61586251165323,56.39603695789977],[-132.67891113588706,56.265194252203756],[-132.84670462683073,56.23130249548469],[-133.0581162901134,56.341865991903774],[-132.94199546355998,56.44742324956001],[-132.70477057268377,56.45575587749897]]],[[[-132.4736298072189,55.495631052101274],[-132.261689742734,55.44212929068669],[-132.08693948733472,55.26214149148847],[-131.97027223177332,55.226026771633244],[-131.96471329571375,55.02547934789265],[-132.0535917766378,54.889646980726404],[-132.00558818514452,54.690206557504474],[-132.290567075652,54.71437407437326],[-132.216372967746,54.793543753050756],[-132.4602846204243,55.043259892935545],[-132.7800037142087,55.18214559018604],[-132.80581347093158,55.26769908064302],[-133.22416854368362,55.282706244630766],[-133.0702914826774,55.57381873340726],[-133.35477528197998,55.60964226275682],[-133.37615159720406,55.72268354638205],[-133.23754191187567,55.74658049075287],[-133.13812705917516,55.886024531940386],[-133.24307468689534,55.90407735901455],[-133.26008153860928,56.15213354206374],[-133.61896163698378,56.20713078248871],[-133.61228725634712,56.34796550311484],[-133.19004884919104,56.32992355488896],[-133.02560946258455,56.17630235403351],[-133.07977592162914,56.05213076531968],[-132.72724964049527,55.98962618710798],[-132.4944551864836,55.81378882394116],[-132.29251495933877,55.536297223057154],[-132.4736298072189,55.495631052101274]]],[[[-132.3919718769193,56.33575591266866],[-132.39669894371366,56.221572971622386],[-132.2016565798316,56.08519899322386],[-132.1816741558966,55.965757890370966],[-132.34000325605177,55.91351911143779],[-132.3816596094174,56.02602287634985],[-132.63670420919033,56.048801837745636],[-132.69615421402082,56.221857375798876],[-132.51752766956682,56.338249137478556],[-132.3919718769193,56.33575591266866]]],[[[-133.28727311628003,56.128519395944195],[-133.31921818080525,55.99351599701698],[-133.47893262458297,56.02238820133506],[-133.62004351254333,55.91906183283302],[-133.79172909277372,55.92072614120792],[-133.68144777295745,56.06601077701742],[-133.28727311628003,56.128519395944195]]],[[[-131.60639097143184,55.31964604742206],[-131.8252903387703,55.45491053870802],[-131.64502507713686,55.544914773213],[-131.69363980088335,55.67629613731105],[-131.5147519050504,55.72601812059639],[-131.43668995214813,55.83990769536735],[-131.23335914917277,55.953515456163785],[-130.9369751849515,55.641875823977635],[-130.96809604720931,55.39104258178649],[-131.1444800984043,55.19660088574169],[-131.29474880084774,55.273537810319574],[-131.60639097143184,55.31964604742206]]],[[[-131.82114047258335,55.41240998671578],[-131.6183218043418,55.28326142852138],[-131.82446121511916,55.211314165413725],[-131.82114047258335,55.41240998671578]]],[[[-131.4689074541167,55.23547966192497],[-131.37500569090088,55.19659534270947],[-131.35665996378773,55.03521586530027],[-131.476956765764,55.000493948849275],[-131.59417666681807,55.10631597695106],[-131.4689074541167,55.23547966192497]]],[[[-133.10385319586123,55.24520296930254],[-132.90693537033954,54.83630881646835],[-133.1502703922549,54.943797380518745],[-133.21582446705193,55.16963724584444],[-133.10385319586123,55.24520296930254]]]]}]};

d3.json(DATAREPO + "metrodata.json", function(error, dat){
  dataTable.setData(dat);
  dataTable.populate(dataTable.data);
  //bind events
  dataTable.pull.style("visibility","visible");
  dataTable.pull.on("mousedown",function(){
    dataTable.move();
  });
  dataTable.pull.on("input",function(d,i){
    clearTimeout(endOfInputTimer);
    var val = this.value;
    var reg = new RegExp(val,"i");
    var reg0 = new RegExp("^"+val,"i");
    var newDat = dataTable.data.filter(function(d,i,a){
      var test = d.data[0];
      return test.search(reg) > -1;
    })
    if(val.length > 0){
      newDat.sort(function(a,b){
        if(a.data[0].search(reg0) > -1){return -1}
        else if(b.data[0].search(reg0) > -1){return 1}
        else{return a.data[0] <= b.data[0] ? -1 : 1}
      }) 
      dataTable.populate(newDat); 
      dataTable.move(true);    
    }
    else{
      endOfInputTimer = setTimeout(function(){dataTable.move(false);},500);
      dataTable.sortDraw(dataTable.data,dataTable.sortIndex,true);
    }

  });

  dataTable.loadSummaryTable = function(){
    var cbsa = MPAR.input.cbsa;
    MPAR.title.metro2.text(MPAR.input.metro);
    var avg = dataTable.metroData.avg;
    var tc = dataTable.metroData.tc;
    var pch = formats.uni("pch");
    var num = formats.uni("num");
    try{
      var r1 = ["All",
                num(avg.metro[cbsa][0].y2000),
                num(avg.metro[cbsa][0].y2012),
                pch(avg.metro[cbsa][0].Change),
                num(avg.city[cbsa][0].y2000),
                num(avg.city[cbsa][0].y2012),
                pch(avg.city[cbsa][0].Change),
                num(avg.suburbs[cbsa][0].y2000),
                num(avg.suburbs[cbsa][0].y2012),
                pch(avg.suburbs[cbsa][0].Change)
                ];
      var r2 = ["High-poverty",
                num(tc.metro[cbsa][0].y2000Hp),
                num(tc.metro[cbsa][0].y2012Hp),
                pch(tc.metro[cbsa][0].ChangeHp),
                num(tc.city[cbsa][0].y2000Hp),
                num(tc.city[cbsa][0].y2012Hp),
                pch(tc.city[cbsa][0].ChangeHp),
                num(tc.suburbs[cbsa][0].y2000Hp),
                num(tc.suburbs[cbsa][0].y2012Hp),
                pch(tc.suburbs[cbsa][0].ChangeHp)
               ];
      var r3 = ["Majority-minority",
                num(tc.metro[cbsa][0].y2000Mm),
                num(tc.metro[cbsa][0].y2012Mm),
                pch(tc.metro[cbsa][0].ChangeMm),
                num(tc.city[cbsa][0].y2000Mm),
                num(tc.city[cbsa][0].y2012Mm),
                pch(tc.city[cbsa][0].ChangeMm),
                num(tc.suburbs[cbsa][0].y2000Mm),
                num(tc.suburbs[cbsa][0].y2012Mm),
                pch(tc.suburbs[cbsa][0].ChangeMm)
               ]
    }
    catch(e){
      var r1 = ["ERROR RETRIEVING DATA"];
      var r2 = [];
      var r3 = [];
    }
    var tr = d3.select(".summaryTable").select("tbody").selectAll("tr").data([r1,r2,r3]);
    tr.enter().append("tr");
    tr.exit().remove();
    var td = tr.selectAll("td").data(function(d,i){return d});
    td.enter().append("td");
    td.exit().remove();
    td.text(function(d,i){return d});
  };
  dataTable.loadSummaryTable();


  d3.select("#chartOptions").style({"visibility":"visible","pointer-events":"auto"}).transition().duration(1000).style("opacity",1);
  dataTable.draw();
});

  (function(){
    var tbody = d3.selectAll("#metroLevelIndicators table tbody").data(MPAR.input.indoptionsMetro); //these exist in markup already
    var tr = tbody.selectAll("tr").data(function(d,i){return d});
    tr.enter().append("tr").append("td").text(function(d,i){return d.t});

    tr.classed("selected",function(d,i){return d===MPAR.input.indoptionsMetroSel});
    tr.on("mousedown",function(d,i){
      if(dataTable.metroData){
        tr.classed("selected",false);
        d3.select(this).classed("selected",true);
        MPAR.input.indoptionsMetroSel = d;
        dataTable.draw();
      }
    });

    var radio = d3.selectAll(".JPRadio");
    var radioFilter = function(){
      d3.event.preventDefault();
      var name = d3.select(this).attr("id");
      var filter = name.search(/metro/i) > -1 ? "metro" : (name.search(/city/i) > -1 ? "city" : "suburbs");
      radio.classed("buttonSelected",false);
      d3.select(this).classed("buttonSelected",true);
      MPAR.input.MetroCitySuburb = filter;
      dataTable.draw();
    }

    radio.on("mousedown",radioFilter);

    var labelG = d3.select("#barChartAnno");
    var nameRadio = d3.select("#labelsRadio");
    nameRadio.on("mousedown",function(){
      showLabels = !showLabels;
      nameRadio.classed("buttonSelected",showLabels);
      labelG.style("visibility",showLabels ? "visible" : "hidden");
      d3.select("#barChartAnno-US").style("visibility",showLabels ? "hidden" : "visible");
      d3.select("#barChart").classed("isLabeled",showLabels);
    })
  })();

  d3.select("#JP15Wrap").on("mousedown",hidetip);

})(); //end closure