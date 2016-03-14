(function(){
	if(!CP2016.session.svg){return null;} //no-op if svg not supported
	var datafile = CP2016.session.repo + "poor.csv";

	var data = [];
	
	var parser = function(d,i){
		return d;
	}

	var pround = d3.format(",.1%");
	var accessor = null;
	var textAccessor = function(d){
		if(accessor){
			var v = [pround(accessor(d))];
		}
		else{
			var v = [];
		}
		return v;
	}
	var cols = d3.interpolateLab("#ffeeee", "#ff0000");

	function redrawMap(){
		//console.log(JSON.stringify(CP2016.state));
		//set accessor
		var self = this;
		accessor = function(d,i){
			var geolevel = CP2016.state.geolevel;
			var metric = CP2016.state.metric;
			var race = CP2016.state.race;
			var period = CP2016.state.period;
			
			var dat = d.data.dat;
			var v = dat[geolevel][race][period][0]; 

			return +v[metric];
		}

		var arr = this.data.map(accessor);
		var max = 1;
		console.log(max);
		var maxR = 10;
		var maxA = Math.PI*(maxR*maxR);

		this.metros.attr("r",function(d,i){
			var val = accessor(d);
			var ratio = val/max;
			var area = ratio*maxA;
			var r = Math.sqrt(area/Math.PI);
			return r;
		})
		.attr("fill",function(d,i){
			var v = accessor(d);
			return cols(v);
		})
		.attr("stroke","#999999");

		this.metros.on("mousedown",function(d,i){
			//self.select(d.geo);
			zoomin.call(self, this, function(){
				CP2016.state.metro = d.geo;
				if(CP2016.drawTracts){
					CP2016.drawTracts(d.geo);
				}				
			});


			//console.log(CP2016);
		});


		var gText = {Metro: "", City: ", urban", Suburb:", suburban"};
		var rText = {All: "", Black:" black", Hispanic:" Hispanic", White:" white"};
		var mText = {poor20sh:"20%+", poor40sh:"40%+"};
		var yText = {"2010_14":"2010–14", "2005_09":"2005–09", "2000":"2000"};

		var title = "Share of the poor" + gText[CP2016.state.geolevel] + rText[CP2016.state.race] + " population that lives in a neighborhood with a "+ mText[CP2016.state.metric]+" poverty rate" 
						+ '<br /><span style="font-size:15px;font-weight:normal;">'+ yText[CP2016.state.period] +'</span>';

		//(CP2016.state.race === "All" ? "" : ("that is "))

		this.title(title, {"margin":"0px 0px 0px 10px", "font-weight":"bold", "font-size":"18px"});
		//self.select(CP2016.state.metro); //re-run select to resize select dot
	}

	var current_zoom = 1;
	var current_translate = [0,0];
	function zoomin(dot,callback){
		var self = this;
		self.highlight();
		var DOT = d3.select(dot);
		var cx = +DOT.attr("cx");
		var cy = +DOT.attr("cy");
		var r = +DOT.attr("r");
		var zmax = (self.width/(r*2));

		var center = [self.width/2, self.height/2];
		console.log(center);
		var target = [center[0] - (cx*zmax), center[1] - (cy*zmax)];

		var factory = function(){
			var z = d3.interpolateNumber(1, zmax);
			var x = d3.interpolateNumber(0, target[0]);
			var y = d3.interpolateNumber(0, target[1]);
			return function(t){
				var zz = z(t);
				var xx = x(t);
				var yy = y(t);
				self.svg.attr("transform","translate(" + xx +","+ yy + ") scale("+zz+")").style("opacity",1-t);
			}
		} 

		self.svg.transition().duration(1500).tween("zoomWayIn", factory)
			.each("end",function(d,i){
				CP2016.dom.show("map2");
				callback();
				self.svg.attr("transform","translate(0,0) scale(1)").style("opacity",1);
			});
	}

	var dmap;
	d3.csv(datafile, parser, function(d){
		var nest = d3.nest()
		  			 .key(function(d,i){return d.cbsa})
		  			 .key(function(d,i){return d.geotype})
		  			 .key(function(d,i){return d.groups})
		  			 .key(function(d,i){return d.yr});
		var dat = nest.map(d);
		
		for(k in dat){
			if(dat.hasOwnProperty(k)){
				data.push({geo:k, dat:dat[k]});
			}
		}

		dmap = new dotMap(CP2016.dom.dotmap.wrap.node()).setData(data, "geo");
		dmap.makeResponsive().draw(redrawMap).showToolTips(textAccessor);

		//fill out the menu
		CP2016.dom.menu.wrap.append("div")
							.append("p").text("Make a selection").style({"margin":"0px","font-style":"italic"});
		var menu = CP2016.dom.menu.wrap.append("div")
									   .classed("horizontal-buttons c-fix",true)

		var labelStyle = {"margin":"10px 0px 3px 0px", "text-transform":"uppercase", "color":"#666666", "font-size":"11px"}
		var menuMetric = menu.append("div");
		menuMetric.append("p").text("Severity of concentrated poverty").style(labelStyle);
		var selMetric = menuMetric.append("select").datum("metric").style("min-width","100%");
		selMetric.selectAll("option.valid-option")
				 .data([{c:"poor20sh", l:"20%+ poverty rate"}, 
						{c:"poor40sh", l:"40%+ poverty rate"}])
				 .enter().append("option")
				 .text(function(d,i){return d.l})
				 .attr("value",function(d,i){return d.c});


		var menuGeolevel = menu.append("div");
		menuGeolevel.append("p").text("Metro area portion").style(labelStyle);;
		var selGeolevel = menuGeolevel.append("select").datum("geolevel").style("min-width","100%");
		selGeolevel.selectAll("option.valid-option").data([{c:"Metro", l:"Entire metro area"}, 
														   {c:"City", l:"City portion"}, 
														   {c:"Suburb", l:"Suburban portion"}]).enter().append("option")
													.text(function(d,i){return d.l})
													.attr("value",function(d,i){return d.c});


		var menuGroup = menu.append("div");
		menuGroup.append("p").text("Race/ethnicity").style(labelStyle);
		var selGroup = menuGroup.append("select").datum("race").style("min-width","100%");
		selGroup.selectAll("option.valid-option").data([{c:"All", l:"All"}, 
														   {c:"Black", l:"Black"}, 
														   {c:"Hispanic", l:"Hispanic"},
														   {c:"White", l:"White"}
														   ])
														   .enter().append("option")
														   .text(function(d,i){return d.l})
														   .attr("value",function(d,i){return d.c});

		var menuYear = menu.append("div");
		menuYear.append("p").text("Time period").style(labelStyle);
		var selYear = menuYear.append("select").datum("period").style("min-width","100%");
		selYear.selectAll("option.valid-option").data([{c:"2010_14", l:"2010–14"},
													   {c:"2005_09", l:"2005–09"},
													   {c:"2000", l:"2000"}])
												.enter().append("option")
												.text(function(d,i){return d.l})
												.attr("value",function(d,i){return d.c});


		menu.selectAll("select").on("change",function(d,i){
			CP2016.state[d] = this.value;
			dmap.draw(redrawMap);
		});

		return data;
	});

	CP2016.dom.show("map1");



	function buildTable(dat){
		
	}
	
})();