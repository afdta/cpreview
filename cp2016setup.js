(function(){
	//global state object for this interactive
	CP2016 = {};

	CP2016.session = {};

	CP2016.session.repo = "./data/"

	//BROWSER TESTING
	if(!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")){
		document.getElementById("cp2016").innerHTML = '<p style="font-style:italic;text-align:center;margin:30px 0px 30px 0px;">This interactive feature requires a modern browser such as Chrome, Firefox, IE9+, or Safari.</p>';
		CP2016.session.svg = false;
		return null;
	}
	else{
		CP2016.session.svg = true;
	}

	//metro lookup table to validate metro areas
	CP2016.metroLookup = {"10420":[{"CBSA_Code":"10420","CBSA_Title":"Akron, OH","lon":-81.34969,"lat":41.14818}],"10580":[{"CBSA_Code":"10580","CBSA_Title":"Albany-Schenectady-Troy, NY","lon":-73.9377,"lat":42.78914}],"10740":[{"CBSA_Code":"10740","CBSA_Title":"Albuquerque, NM","lon":-106.47079,"lat":35.12124}],"10900":[{"CBSA_Code":"10900","CBSA_Title":"Allentown-Bethlehem-Easton, PA-NJ","lon":-75.40179,"lat":40.78826}],"12060":[{"CBSA_Code":"12060","CBSA_Title":"Atlanta-Sandy Springs-Roswell, GA","lon":-84.39655,"lat":33.69587}],"12260":[{"CBSA_Code":"12260","CBSA_Title":"Augusta-Richmond County, GA-SC","lon":-81.98039,"lat":33.45706}],"12420":[{"CBSA_Code":"12420","CBSA_Title":"Austin-Round Rock, TX","lon":-97.655,"lat":30.26279}],"12540":[{"CBSA_Code":"12540","CBSA_Title":"Bakersfield, CA","lon":-118.72778,"lat":35.34329}],"12580":[{"CBSA_Code":"12580","CBSA_Title":"Baltimore-Columbia-Towson, MD","lon":-76.67215,"lat":39.38384}],"12940":[{"CBSA_Code":"12940","CBSA_Title":"Baton Rouge, LA","lon":-91.13242,"lat":30.57093}],"13820":[{"CBSA_Code":"13820","CBSA_Title":"Birmingham-Hoover, AL","lon":-86.81439,"lat":33.46395}],"14260":[{"CBSA_Code":"14260","CBSA_Title":"Boise City, ID","lon":-116.14168,"lat":43.0153}],"14460":[{"CBSA_Code":"14460","CBSA_Title":"Boston-Cambridge-Newton, MA-NH","lon":-71.10341,"lat":42.55381}],"14860":[{"CBSA_Code":"14860","CBSA_Title":"Bridgeport-Stamford-Norwalk, CT","lon":-73.38907,"lat":41.26825}],"15380":[{"CBSA_Code":"15380","CBSA_Title":"Buffalo-Cheektowaga-Niagara Falls, NY","lon":-78.73837,"lat":42.91215}],"15980":[{"CBSA_Code":"15980","CBSA_Title":"Cape Coral-Fort Myers, FL","lon":-81.82069,"lat":26.57868}],"16700":[{"CBSA_Code":"16700","CBSA_Title":"Charleston-North Charleston, SC","lon":-80.04409,"lat":33.04161}],"16740":[{"CBSA_Code":"16740","CBSA_Title":"Charlotte-Concord-Gastonia, NC-SC","lon":-80.86895,"lat":35.18707}],"16860":[{"CBSA_Code":"16860","CBSA_Title":"Chattanooga, TN-GA","lon":-85.35889,"lat":35.05048}],"16980":[{"CBSA_Code":"16980","CBSA_Title":"Chicago-Naperville-Elgin, IL-IN-WI","lon":-87.96401,"lat":41.70346}],"17140":[{"CBSA_Code":"17140","CBSA_Title":"Cincinnati, OH-KY-IN","lon":-84.42787,"lat":39.07085}],"17460":[{"CBSA_Code":"17460","CBSA_Title":"Cleveland-Elyria, OH","lon":-81.68392,"lat":41.37554}],"17820":[{"CBSA_Code":"17820","CBSA_Title":"Colorado Springs, CO","lon":-104.65854,"lat":38.84266}],"17900":[{"CBSA_Code":"17900","CBSA_Title":"Columbia, SC","lon":-81.04336,"lat":34.0902}],"18140":[{"CBSA_Code":"18140","CBSA_Title":"Columbus, OH","lon":-82.83849,"lat":39.96695}],"19100":[{"CBSA_Code":"19100","CBSA_Title":"Dallas-Fort Worth-Arlington, TX","lon":-97.02517,"lat":32.81818}],"19380":[{"CBSA_Code":"19380","CBSA_Title":"Dayton, OH","lon":-84.13996,"lat":39.82953}],"19660":[{"CBSA_Code":"19660","CBSA_Title":"Deltona-Daytona Beach-Ormond Beach, FL","lon":-81.2182,"lat":29.16992}],"19740":[{"CBSA_Code":"19740","CBSA_Title":"Denver-Aurora-Lakewood, CO","lon":-104.89423,"lat":39.43424}],"19780":[{"CBSA_Code":"19780","CBSA_Title":"Des Moines-West Des Moines, IA","lon":-93.94314,"lat":41.54787}],"19820":[{"CBSA_Code":"19820","CBSA_Title":"Detroit-Warren-Dearborn, MI","lon":-83.23326,"lat":42.72034}],"21340":[{"CBSA_Code":"21340","CBSA_Title":"El Paso, TX","lon":-105.53863,"lat":31.51179}],"23420":[{"CBSA_Code":"23420","CBSA_Title":"Fresno, CA","lon":-119.64919,"lat":36.75656}],"24340":[{"CBSA_Code":"24340","CBSA_Title":"Grand Rapids-Wyoming, MI","lon":-85.48828,"lat":42.99883}],"24660":[{"CBSA_Code":"24660","CBSA_Title":"Greensboro-High Point, NC","lon":-79.79125,"lat":36.02635}],"24860":[{"CBSA_Code":"24860","CBSA_Title":"Greenville-Anderson-Mauldin, SC","lon":-82.41681,"lat":34.68887}],"25420":[{"CBSA_Code":"25420","CBSA_Title":"Harrisburg-Carlisle, PA","lon":-77.09446,"lat":40.32777}],"25540":[{"CBSA_Code":"25540","CBSA_Title":"Hartford-West Hartford-East Hartford, CT","lon":-72.57895,"lat":41.73265}],"26420":[{"CBSA_Code":"26420","CBSA_Title":"Houston-The Woodlands-Sugar Land, TX","lon":-95.39645,"lat":29.78191}],"26900":[{"CBSA_Code":"26900","CBSA_Title":"Indianapolis-Carmel-Anderson, IN","lon":-86.2069,"lat":39.74684}],"27140":[{"CBSA_Code":"27140","CBSA_Title":"Jackson, MS","lon":-90.22161,"lat":32.31708}],"27260":[{"CBSA_Code":"27260","CBSA_Title":"Jacksonville, FL","lon":-81.79257,"lat":30.23654}],"28140":[{"CBSA_Code":"28140","CBSA_Title":"Kansas City, MO-KS","lon":-94.44642,"lat":38.93678}],"28940":[{"CBSA_Code":"28940","CBSA_Title":"Knoxville, TN","lon":-84.13579,"lat":36.04342}],"29460":[{"CBSA_Code":"29460","CBSA_Title":"Lakeland-Winter Haven, FL","lon":-81.69913,"lat":27.95028}],"29820":[{"CBSA_Code":"29820","CBSA_Title":"Las Vegas-Henderson-Paradise, NV","lon":-115.0156,"lat":36.21495}],"30780":[{"CBSA_Code":"30780","CBSA_Title":"Little Rock-North Little Rock-Conway, AR","lon":-92.39605,"lat":34.75591}],"31080":[{"CBSA_Code":"31080","CBSA_Title":"Los Angeles-Long Beach-Anaheim, CA","lon":-118.13882,"lat":34.24737}],"31140":[{"CBSA_Code":"31140","CBSA_Title":"Louisville/Jefferson County, KY-IN","lon":-85.66996,"lat":38.33707}],"31540":[{"CBSA_Code":"31540","CBSA_Title":"Madison, WI","lon":-89.59095,"lat":43.07942}],"32580":[{"CBSA_Code":"32580","CBSA_Title":"McAllen-Edinburg-Mission, TX","lon":-98.18056,"lat":26.39641}],"32820":[{"CBSA_Code":"32820","CBSA_Title":"Memphis, TN-MS-AR","lon":-89.81524,"lat":35.00759}],"33100":[{"CBSA_Code":"33100","CBSA_Title":"Miami-Fort Lauderdale-West Palm Beach, FL","lon":-80.50589,"lat":26.16073}],"33340":[{"CBSA_Code":"33340","CBSA_Title":"Milwaukee-Waukesha-West Allis, WI","lon":-88.17343,"lat":43.17734}],"33460":[{"CBSA_Code":"33460","CBSA_Title":"Minneapolis-St. Paul-Bloomington, MN-WI","lon":-93.34635,"lat":45.06567}],"34980":[{"CBSA_Code":"34980","CBSA_Title":"Nashville-Davidson--Murfreesboro--Franklin, TN","lon":-86.72491,"lat":36.08809}],"35300":[{"CBSA_Code":"35300","CBSA_Title":"New Haven-Milford, CT","lon":-72.93774,"lat":41.41204}],"35380":[{"CBSA_Code":"35380","CBSA_Title":"New Orleans-Metairie, LA","lon":-89.9602,"lat":29.91839}],"35620":[{"CBSA_Code":"35620","CBSA_Title":"New York-Newark-Jersey City, NY-NJ-PA","lon":-74.08915,"lat":40.9223}],"35840":[{"CBSA_Code":"35840","CBSA_Title":"North Port-Sarasota-Bradenton, FL","lon":-82.32237,"lat":27.34782}],"36260":[{"CBSA_Code":"36260","CBSA_Title":"Ogden-Clearfield, UT","lon":-112.81807,"lat":41.4327}],"36420":[{"CBSA_Code":"36420","CBSA_Title":"Oklahoma City, OK","lon":-97.50489,"lat":35.42866}],"36540":[{"CBSA_Code":"36540","CBSA_Title":"Omaha-Council Bluffs, NE-IA","lon":-95.99977,"lat":41.29036}],"36740":[{"CBSA_Code":"36740","CBSA_Title":"Orlando-Kissimmee-Sanford, FL","lon":-81.36358,"lat":28.43351}],"37100":[{"CBSA_Code":"37100","CBSA_Title":"Oxnard-Thousand Oaks-Ventura, CA","lon":-119.0789,"lat":34.47314}],"37340":[{"CBSA_Code":"37340","CBSA_Title":"Palm Bay-Melbourne-Titusville, FL","lon":-80.73251,"lat":28.29376}],"37980":[{"CBSA_Code":"37980","CBSA_Title":"Philadelphia-Camden-Wilmington, PA-NJ-DE-MD","lon":-75.30322,"lat":39.9046}],"38060":[{"CBSA_Code":"38060","CBSA_Title":"Phoenix-Mesa-Scottsdale, AZ","lon":-112.07073,"lat":33.18583}],"38300":[{"CBSA_Code":"38300","CBSA_Title":"Pittsburgh, PA","lon":-79.83087,"lat":40.43941}],"38900":[{"CBSA_Code":"38900","CBSA_Title":"Portland-Vancouver-Hillsboro, OR-WA","lon":-122.47825,"lat":45.59765}],"39300":[{"CBSA_Code":"39300","CBSA_Title":"Providence-Warwick, RI-MA","lon":-71.3998,"lat":41.72421}],"39340":[{"CBSA_Code":"39340","CBSA_Title":"Provo-Orem, UT","lon":-112.35358,"lat":39.86421}],"39580":[{"CBSA_Code":"39580","CBSA_Title":"Raleigh, NC","lon":-78.4617,"lat":35.75394}],"40060":[{"CBSA_Code":"40060","CBSA_Title":"Richmond, VA","lon":-77.47248,"lat":37.46045}],"40140":[{"CBSA_Code":"40140","CBSA_Title":"Riverside-San Bernardino-Ontario, CA","lon":-116.12824,"lat":34.55222}],"40380":[{"CBSA_Code":"40380","CBSA_Title":"Rochester, NY","lon":-77.50946,"lat":42.96878}],"40900":[{"CBSA_Code":"40900","CBSA_Title":"Sacramento--Roseville--Arden-Arcade, CA","lon":-120.99846,"lat":38.78115}],"41180":[{"CBSA_Code":"41180","CBSA_Title":"St. Louis, MO-IL","lon":-90.34993,"lat":38.73358}],"41620":[{"CBSA_Code":"41620","CBSA_Title":"Salt Lake City, UT","lon":-113.0109,"lat":40.4709}],"41700":[{"CBSA_Code":"41700","CBSA_Title":"San Antonio-New Braunfels, TX","lon":-98.60154,"lat":29.42828}],"41740":[{"CBSA_Code":"41740","CBSA_Title":"San Diego-Carlsbad, CA","lon":-116.73186,"lat":33.03348}],"41860":[{"CBSA_Code":"41860","CBSA_Title":"San Francisco-Oakland-Hayward, CA","lon":-122.01491,"lat":37.70206}],"41940":[{"CBSA_Code":"41940","CBSA_Title":"San Jose-Sunnyvale-Santa Clara, CA","lon":-121.37455,"lat":36.90902}],"42540":[{"CBSA_Code":"42540","CBSA_Title":"Scranton--Wilkes-Barre--Hazleton, PA","lon":-75.89452,"lat":41.32314}],"42660":[{"CBSA_Code":"42660","CBSA_Title":"Seattle-Tacoma-Bellevue, WA","lon":-121.86564,"lat":47.55345}],"44060":[{"CBSA_Code":"44060","CBSA_Title":"Spokane-Spokane Valley, WA","lon":-117.57219,"lat":48.19339}],"44140":[{"CBSA_Code":"44140","CBSA_Title":"Springfield, MA","lon":-72.64483,"lat":42.22917}],"44700":[{"CBSA_Code":"44700","CBSA_Title":"Stockton-Lodi, CA","lon":-121.27231,"lat":37.93234}],"45060":[{"CBSA_Code":"45060","CBSA_Title":"Syracuse, NY","lon":-76.03377,"lat":43.15681}],"45300":[{"CBSA_Code":"45300","CBSA_Title":"Tampa-St. Petersburg-Clearwater, FL","lon":-82.4056,"lat":28.15434}],"45780":[{"CBSA_Code":"45780","CBSA_Title":"Toledo, OH","lon":-83.78038,"lat":41.49856}],"46060":[{"CBSA_Code":"46060","CBSA_Title":"Tucson, AZ","lon":-111.78996,"lat":32.09743}],"46140":[{"CBSA_Code":"46140","CBSA_Title":"Tulsa, OK","lon":-96.16542,"lat":36.24962}],"46520":[{"CBSA_Code":"46520","CBSA_Title":"Urban Honolulu, HI","lon":-157.97572,"lat":21.4604}],"47260":[{"CBSA_Code":"47260","CBSA_Title":"Virginia Beach-Norfolk-Newport News, VA-NC","lon":-76.4147,"lat":36.65574}],"47900":[{"CBSA_Code":"47900","CBSA_Title":"Washington-Arlington-Alexandria, DC-VA-MD-WV","lon":-77.47239,"lat":38.83189}],"48620":[{"CBSA_Code":"48620","CBSA_Title":"Wichita, KS","lon":-97.39811,"lat":37.62504}],"49180":[{"CBSA_Code":"49180","CBSA_Title":"Winston-Salem, NC","lon":-80.3451,"lat":36.07244}],"49340":[{"CBSA_Code":"49340","CBSA_Title":"Worcester, MA-CT","lon":-71.92866,"lat":42.2188}],"49660":[{"CBSA_Code":"49660","CBSA_Title":"Youngstown-Warren-Boardman, OH-PA","lon":-80.56419,"lat":41.24169}]};
	CP2016.metroList = [];
	(function(){
		for(var p in CP2016.metroLookup){
			if(CP2016.metroLookup.hasOwnProperty(p)){
				CP2016.metroList.push(CP2016.metroLookup[p][0]);
			}
		}
	})();
	
	//STATE
	CP2016.state = {};
	CP2016.state.metro = null; //only relevant for tractmap -- this is null when tractmap not in view
	CP2016.state.geolevel = "Metro";
	CP2016.state.race = "All";
	CP2016.state.period = "2010_14";
	CP2016.state.metric = "poor20sh";

	CP2016.drawTracts = null;

	//DOM ELEMENTS
	CP2016.dom = {};

	CP2016.dom.menu = {};
	CP2016.dom.menu.wrap = d3.select("#cp2016-shared-menu").classed("c-fix",true);
	CP2016.dom.menu.button = d3.select("#cp2016-shared-menu-button");
	CP2016.dom.menu.content = d3.select("#cp2016-shared-menu-content");

	CP2016.dom.table = {};
	CP2016.dom.table.wrap = d3.select("#cp2016-table");
	CP2016.dom.table.title = d3.select("#cp2016-table-title");
	CP2016.dom.table.header = CP2016.dom.table.wrap.append("div");
	CP2016.dom.table.body = CP2016.dom.table.wrap.append("div").style({"overflow-y":"auto","border":"1px solid #aaaaaa","border-width":"1px 0px","padding-right":"15px"});
	CP2016.dom.table.footer = CP2016.dom.table.wrap.append("div");
	CP2016.dom.table.button = null;
	
	CP2016.dom.dotmap = {};
	CP2016.dom.dotmap.wrap = d3.select("#cp2016-dotmap-wrap");
	CP2016.dom.dotmap.mapwrap = d3.select("#cp2016-dotmap");
	//CP2016.dom.dotmap.svg = CP2016.dom.dotmap.wrap.append("svg").style({"width":"100%","height":"100%"});

	CP2016.dom.tractmap = {};
	CP2016.dom.tractmap.WIDTH = 950;
	CP2016.dom.tractmap.HEIGHT = 700;
	CP2016.dom.tractmap.CENTER = [CP2016.dom.tractmap.WIDTH/2, CP2016.dom.tractmap.HEIGHT/2];

	CP2016.dom.tractmap.outer = d3.select("#cp2016-tractmap-outer");
	CP2016.dom.tractmap.wrap = d3.select("#cp2016-tractmap")
								 	.style({"height":CP2016.dom.tractmap.HEIGHT+"px", "width":CP2016.dom.tractmap.WIDTH+"px"});
	// = CP2016.dom.tractmap.wrap.append("div").classed("horizontal-buttons c-fix",true);
	CP2016.dom.tractmap.title = d3.select("#cp2016-tractmap-title").append("p")
	CP2016.dom.tractmap.svg = CP2016.dom.tractmap.wrap.append("svg").style({"cursor":"move","width":"100%","height":"100%","visibility":"hidden"});
	CP2016.dom.tractmap.tractwrap = CP2016.dom.tractmap.svg.append("g");
	CP2016.dom.tractmap.tracts = CP2016.dom.tractmap.tractwrap.append("g");
	CP2016.dom.tractmap.tracts00 = CP2016.dom.tractmap.tractwrap.append("g"); //hold 05-09 data in separate layer
	CP2016.dom.tractmap.outlines = CP2016.dom.tractmap.tractwrap.append("g");
	CP2016.dom.tractmap.hovertract = CP2016.dom.tractmap.tractwrap.append("g").append("path");
	CP2016.dom.tractmap.legend = d3.select("#cp2016-tractmap-legend");
	CP2016.dom.tractmap.back = d3.select("#cp2016-tract-map-back");
	CP2016.dom.tractmap.periods = d3.select("#cp2016-tract-map-buttons").classed("horizontal-buttons c-fix",true);
	CP2016.dom.tractmap.tip = CP2016.dom.tractmap.wrap.append("div").classed("cp2016-tooltip",true);
	
	CP2016.dom.tractmap.messages = d3.select("#cp2016-tractmap-message");

	CP2016.dom.tractmap.zoom = {};
	CP2016.dom.tractmap.zoom.in = d3.select("#zoomCtrlIn");
	CP2016.dom.tractmap.zoom.out = d3.select("#zoomCtrlOut");
	CP2016.dom.tractmap.zoom.scale = 1; //current zoom scale
	CP2016.dom.tractmap.zoom.level = 0; //current zoom level in "levels" below
	CP2016.dom.tractmap.zoom.levels = [1,2,3,5,8,12,17,23];
	CP2016.dom.tractmap.zoom.yOffset = 50;
	CP2016.dom.tractmap.zoom.translate = {x:0,y:0 + CP2016.dom.tractmap.zoom.yOffset};


	CP2016.dom.allviews = d3.selectAll(".cp2016-view");

	CP2016.dom.show = function(map1or2){
		CP2016.dom.allviews.classed("out-of-view",true);
		if(map1or2==="map1"){
			var toshow = CP2016.dom.dotmap.wrap;
			CP2016.dom.menu.button.style("display","block");
			CP2016.dom.tractmap.svg.style("visibility","hidden");
		}
		else if(map1or2==="map2"){
			var toshow = CP2016.dom.tractmap.outer;
			CP2016.dom.menu.button.style("display","none");
		}
		else {
			var toshow = CP2016.dom.dotmap.wrap; //dotmap is default
		}
		
		toshow.classed("out-of-view",false);	
	}


	CP2016.color = {}
	var labScale = d3.interpolateLab("#ffffff","#053769");
	var labScaleR = d3.interpolateLab("#ffffff","#ff5e1a");
	CP2016.color.lab = function(v){
	  if(v){
	    return v >= 0 ? labScale(v) : labScaleR(Math.abs(v));
	  }
	  else{
	    return "#ffffff"; //NaN, null, undefined
	  }
	}

	CP2016.scales = {};
	CP2016.scales.quantile30 = d3.scale.quantize().domain([0,1]).range([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]);
	CP2016.scales.quantile5 = d3.scale.quantize().domain([0,1]).range([1,2,3,4,5]);

	//dat should be an array of arrays each row should have a code property attached to it for the metro code
	CP2016.dom.table.fill = function(dat){

		var data = dat.slice(1);
		var header = [dat[0]];

		//body
		var body = CP2016.dom.table.body.selectAll("div.as-table").data([data]);
		body.enter().append("div").classed("as-table",true);
		body.exit().remove();

		var rows = body.selectAll("div.as-row").data(function(d,i){return d});
		rows.enter().append("div").classed("as-row row-highlight",true);
		rows.exit().remove();

		var cells = rows.selectAll("div.as-cell").data(function(d,i){return d});
		cells.enter().append("div").classed("as-cell",true).append("p");
		cells.exit().remove();

		cells.style("width",function(d,i){
			return i===0 ? "40%" : "20%"
		})

		cells.style("cursor","pointer");

		cells.select("p").text(function(d,i){return d})
						 .style("text-align",function(d,i){return i===0 ? "left" :"right"});

		//header
		var hbody = CP2016.dom.table.header.selectAll("div.as-table").data([header]);
		hbody.enter().append("div").classed("as-table",true);
		hbody.exit().remove();

		var hrows = hbody.selectAll("div.as-row").data(function(d,i){return d});
		hrows.enter().append("div").classed("as-row",true);
		hrows.exit().remove();

		var hcells = hrows.selectAll("div.as-cell").data(function(d,i){return d});
		hcells.enter().append("div").classed("as-cell",true).append("p");
		hcells.exit().remove();

		hcells.style("width",function(d,i){
			return i===0 ? "40%" : "20%"
		})

		hcells.select("p").text(function(d,i){return d})
						  .style("text-align",function(d,i){return i===0 ? "left" :"right"});

		rows.on("mousedown",function(d,i){
			if(CP2016.drawTracts){
				CP2016.drawTracts(d.code);
				CP2016.dom.show("map2");
			}
		});
		
		rows.on("touchstart",function(d,i){
			d3.event.preventDefault();
			if(CP2016.drawTracts){
				CP2016.drawTracts(d.code);
				CP2016.dom.show("map2");
			}
		});

		//rows.on("mouseenter",function(d,i){d3.select(this).classed("as-row",false)});
		//rows.on("mouseleave",function(d,i){d3.select(this).classed("as-row",true)})

		if(CP2016.dom.table.resize){CP2016.dom.table.resize();}

		return hcells;
	}

	CP2016.dom.table.resize = function(){
		//resize in next tick cycle
		setTimeout(function(){
			try{
				var obox = CP2016.dom.table.wrap.node().getBoundingClientRect();
				var hbox = CP2016.dom.table.header.node().getBoundingClientRect();
				var box = CP2016.dom.table.body.selectAll("div.as-row").node().getBoundingClientRect();
				var w = box.right-box.left;

				var oh = obox.bottom - obox.top;
				
				var off = hbox.bottom - obox.top + 20; //bottom of header - top of outer box (space used up above body)

				CP2016.dom.table.body.style("height", Math.round(oh-off)+"px");

				CP2016.dom.table.header.selectAll("div.as-table").style("width",w+"px");	
				}
			catch(e){
				//no-op
			}	
		}, 0);
	}

	window.addEventListener("resize", CP2016.dom.table.resize);

})();