(function(){
	if(!CP2016.session.svg){return null;} //no-op if svg not supported
	var datafile = CP2016.session.repo + "CPMetro.csv";

	var dat; //will be assigned the metro area nest of data
	var data = []; //will hold array of metro area objects
	
	var parser = function(d,i){
		return d;
	}

	var pround = d3.format(",.1%");
	var cpround = d3.format("+,.1%");
	CP2016.pround = pround;
	CP2016.cpround = cpround;

	var cols = d3.interpolateLab("#ffffcf", "#d7191c");
	
	var cols2r = d3.interpolateLab("#ffffcf", "#d7191c");
	var cols2b = d3.interpolateLab("#ffffcf", "#2b83ba");

	var accessor; 
	var issig;
	//text accessor will have access to the map object as thisobject -- it depends on the current value of accessor
	function textAccessor(d){
		var fmt = function(v){
			if(v===null){
				var f = "N/A";
			}
			else{
				var f = CP2016.state.period in {"00to0509":1, "0509to1014":1} ? cpround(v) : pround(v);
			}
			return f;
		};
		var sig = issig(d);
		var asterisk = (sig==="1" || sig==="-1" || sig==="0" ? "*" : "");
		var sub = "";
		if(sig==="1" || sig==="-1"){
			var sub = '<span style="color:#666666;margin-top:15px;">*Statistically significant from zero</span>'
		}
		else if(sig==="0"){
			var sub = '<span style="color:#666666;margin-top:15px;">*Not statistically significant from zero</span>'
		}
	
		return ['<span style="margin-top:10px;font-size:26px">' + fmt(accessor(d)) + asterisk + '</span>', sub];
	}

	//radius function takes the value
	function dotSizing(v){
		var max = 1; //100%
		var maxR = 13;
		var maxA = Math.PI*(maxR*maxR);
		var self = this;

		var ratio = v/max;
		var area = ratio*maxA;
		var r = Math.sqrt(area/Math.PI);
		
		return r;	
	}

	function dotSizing2(v){
		var max = 0.4; //100%
		var maxR = 13;
		var maxA = Math.PI*(maxR*maxR);
		var self = this;

		var ratio = Math.abs(v)/max;
		var area = ratio*maxA;
		var r = Math.sqrt(area/Math.PI) + 1; //add 1 to avoid 0 radius dots
		
		return r;		
	}

	function dotFill(v){
		return cols(v);
	}

	function dotFill2(v){
		var ratio = v < 0 ? Math.abs(v)/0.4 : v/0.4;
		if(ratio > 1){ratio = 1}
		var c = v < 0 ? cols2b(ratio) : cols2r(ratio);
		return c;
	}

	//resetting the accessor is a critical task for this callback -- it affects the tooltip text as well
	function redrawMap(){
		var self = this;

		accessor = function(d){
			var geolevel = CP2016.state.geolevel;
			var metric = CP2016.state.metric;
			var race = CP2016.state.race;
			var period = CP2016.state.period;
			
			var v = d.dat[geolevel][race][period][0]; 

			return +v[metric];
		};

		issig = function(d){
			var geolevel = CP2016.state.geolevel;
			var metric = CP2016.state.metric;
			var race = CP2016.state.race;
			var period = CP2016.state.period;
			
			var v = d.dat[geolevel][race][period][0]; 

			return v[metric+"sig"];			
		}

		var accessor2 = function(d){
			var geolevel = CP2016.state.geolevel;
			var metric = CP2016.state.metric;
			var race = CP2016.state.race;
			var v0 = d.dat[geolevel][race]["2000"][0];
			var v1 = d.dat[geolevel][race]["2005_09"][0];
			var v2 = d.dat[geolevel][race]["2010_14"][0];

			return [+v0[metric], +v1[metric], +v2[metric]];
		}

		self.setAccessor(accessor);
		self.setAes("fill", CP2016.state.period in {"00to0509":1, "0509to1014":1} ? dotFill2 : dotFill);
		self.setAes("r", CP2016.state.period in {"00to0509":1, "0509to1014":1} ? dotSizing2 : dotSizing);
		if(CP2016.state.period in {"00to0509":1, "0509to1014":1}){
			self.legend([-0.4, -0.2, -0.1, 0.1, 0.2, 0.4], ["-40% pts.", "-20% pts.", "-10% pts.", "+10% pts.", "+20% pts.", "+40% pts."]);
		}
		else{
			self.legend([0.2, 0.3, 0.5, 0.7, 0.9], ["20.0%", "30.0%", "50.0%", "70.0%", "90.0%"]);
		}

		var sort_index;
		var tableHeader = [["Metro area", "Share in 2000", "Share in 2005–09", "Share in 2010–14"]];
		var tableRows = this.getData(accessor2).sort(function(a,b){
			sort_index = CP2016.state.period==="2000" ? 0 : (CP2016.state.period==="2005_09" ? 1 : 2);
			return b.value[sort_index] - a.value[sort_index];
		});

		var tableRowsFmt = tableRows.map(function(d,i){
								var row = [d.metro, pround(d.value[0]), pround(d.value[1]), pround(d.value[2])];
								row.code = d.geo;
								return row;
							});
		

		var tableArr = tableHeader.concat(tableRowsFmt);
		var hcells = CP2016.dom.table.fill(tableArr);
		hcells.classed("sort-desc", function(d,i){
			return (i-1) === sort_index;
		})
		CP2016.dom.table.resize();

		var arr = this.getData();


		this.metros.attr("stroke","#999999");

		this.metros.on("mousedown",function(d,i){
			//self.select(d.geo);
			zoomin.call(self, this, function(){
				if(CP2016.drawTracts){
					CP2016.drawTracts(d.geo);
				}				
			});


			//console.log(CP2016);
		}).style("cursor","pointer");


		var gText = {Metro: "", City: ", urban", Suburb:", suburban"};
		var rText = {All: "", Black:" black", Hispanic:" Hispanic", White:" white"};
		var mText = {poor20sh:"20%+", poor40sh:"40%+"};
		var yText = {"2010_14":"Multi-year estimate, 2010–14", "2005_09":"Multi-year estimate, 2005–09", "2000":"2000", "00to0509":"Change, 2000 to 2005–09", "0509to1014":"Change, 2005–09 to 2010–14"};

		var title1 = "Share of the poor" + gText[CP2016.state.geolevel] + rText[CP2016.state.race] + " population living in a neighborhood with a "+ mText[CP2016.state.metric]+" poverty rate";
		//var title2 =  '<br /><span style="font-size:15px;font-weight:normal;">'+ yText[CP2016.state.period] +'</span>';
		var title2 = '<br /><span style="font-weight:bold;font-size:15px">'+yText[CP2016.state.period]+'</span><span style="font-size:15px;font-weight:normal;"> | Click on a metro area to view its neighborhood-level map</span>';
		var title3 = '<br /><span style="font-size:15px;font-weight:normal;">Click on a metro area to view its neighborhood-level map</span>';

		//(CP2016.state.race === "All" ? "" : ("that is "))
		var titleStyle = {"margin":"0px 45px 0px 10px", "font-weight":"bold", "font-size":"17px"};
		this.title(title1 + title2, titleStyle);
		CP2016.dom.table.title.html(title1 + title3).style({"font-weight":"bold","font-size":"17px", "margin":"0px 45px 10px 0px"});
		//self.select(CP2016.state.metro); //re-run select to resize select dot
	}

	var current_zoom = 1;
	var current_translate = [0,0];
	function zoomin(dot,callback){
		var self = this;

		var DOT = d3.select(dot);
		var cx = +DOT.attr("cx");
		var cy = +DOT.attr("cy");
		var r = +DOT.attr("r");
		var zmax = (self.width/(r*2));

		self.highlight();
		self.select(DOT.datum().geo);
		CP2016.dom.menu.wrap.classed("out-of-view",true);

		var center = [self.width/2, self.height/2];
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
		callback(); //since visibility is hidden until view is show, this shouldn't cause jittery zoom
		self.svg.transition().duration(1500).tween("zoomWayIn", factory)
			.each("end",function(d,i){
				CP2016.dom.show("map2");
				//callback();
				self.svg.attr("transform","translate(0,0) scale(1)").style("opacity",1);
				self.select();
			});
	}

	var dmap;
	d3.csv(datafile, parser, function(d){
		var nest = d3.nest()
		  			 .key(function(d,i){return d.cbsa})
		  			 .key(function(d,i){return d.geotype})
		  			 .key(function(d,i){return d.groups})
		  			 .key(function(d,i){return d.yr});
		dat = nest.map(d);
		
		for(k in dat){
			if(dat.hasOwnProperty(k)){
				data.push({geo:k, dat:dat[k]});
			}
		}

		dmap = new dotMap(CP2016.dom.dotmap.mapwrap.node());
		dmap.setData(data,"geo").makeResponsive().draw(redrawMap).showToolTips(textAccessor);
		
		//fill out the menu
		var menu = CP2016.dom.menu.content;

		menu.append("div").style("margin-top","12px")
							.append("p").text("Make a selection").style({"margin":"0px","font-style":"italic"});
		

		var labelStyle = {"margin":"0px 0px 3px 0px", "text-transform":"uppercase", "color":"#666666", "font-size":"11px"}
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
													   {c:"2000", l:"2000"},
													   {c:"00to0509", l:"Change, 2000 to 2005–09"},
													   {c:"0509to1014", l:"Change, 2005–09 to 2010–14"}
													   ])
												.enter().append("option")
												.text(function(d,i){return d.l})
												.attr("value",function(d,i){return d.c});

		CP2016.dom.table.button = menu.append("p").text("View data table »")
										.style({"margin":"20px 0px 20px 10px", "cursor":"pointer"})
										.on("mousedown",function(d,i){
											d3.event.stopPropagation();
											var toshow = CP2016.dom.table.wrap.classed("out-of-view");
											var thiz = d3.select(this);
											if(toshow){
												CP2016.dom.table.wrap.classed("out-of-view",false);	
												thiz.text("« Hide table")
											}
											else{
												CP2016.dom.table.wrap.classed("out-of-view",true);
												thiz.text("View data table »")
											}
											//CP2016.dom.menu.content.classed("out-of-view",true);
										});


		menu.selectAll("select").on("change",function(d,i){
			CP2016.state[d] = this.value;
			dmap.draw(redrawMap);
		});

		CP2016.dom.menu.button.style("visibility","visible").on("mousedown", function(){
			var show = !menu.classed("out-of-view");
			menu.classed("out-of-view",show);
		});

		var tiptimer;
		CP2016.dom.menu.wrap.on("mouseleave",function(d,i){
			tiptimer = setTimeout(function(){
				menu.classed("out-of-view",true);
			},150);
		}).on("mouseenter",function(d,i){
			clearTimeout(tiptimer);
		});

		return data;
	});

	CP2016.dom.show("map1");
	
})();