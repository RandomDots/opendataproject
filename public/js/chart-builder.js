// TODO
// 1. Type selection based on first 10 rows
// 1. Option to select Header Row
// 1. Transposer - Slick Grid should change
// 1. Save settings

var ChartBuilder = Class.extend({
	init: function(opts) {
		// opts = {
		// 	url: "wb-india.csv"
		// 	
		// }
		var me = this;
		$.extend(this, opts);
		$("#chart, #slickgrid").empty();
		$("#chart-builder-edit").toggle(true)
			.unbind("click")
			.on("click", function() { me.make_conf_editor(); return false;});
		this.set_title(this.title);
		this.get_csv(this.url);
	},
	
	set_title: function(title) {
		if(!title) title = "Chart Builder";
		$("head title").text(title);
		$(".navbar-brand").text(title);
	},
	
	make_conf_editor: function() {
		var me = this;
		this.conf_editor = $('<div class="modal" style="overflow: auto;" tabindex="-1">\
			<div class="modal-dialog">\
				<div class="modal-content">\
					<div class="modal-header">\
						<a type="button" class="close"\
							data-dismiss="modal" aria-hidden="true">&times;</a>\
						<h4 class="modal-title">Edit Settings</h4>\
					</div>\
					<div class="modal-body ui-front">\
					<div class="row">\
					    <div class="col-md-6" style="">\
					        <div class="form-group" style="position: static;">\
					            <label for="chart-type">Chart Type</label>\
					            <select class="form-control" id="chart-type">\
									<option value="Line">Line</option>\
								    <option value="Bar">Bar</option>\
								    <option value="Radar">Radar</option>\
									<option value="Pie">Pie</option>\
								</select>\
					            <p class="help-block">One of Line, Bar, Radar</p>\
					        </div>\
					        <div class="form-group">\
					            <label for="start-column">First Column</label>\
					            <select class="form-control" id="start-column"></select>\
					            <p class="help-block">First column to plot data</p>\
					        </div>\
					        <div class="form-group">\
					            <label for="head-row">Head Row</label>\
					            <select class="form-control" id="head-row"></select>\
					            <p class="help-block">Row that labels the data</p>\
					        </div>\
					        <div class="form-group" style="padding-right: 20px; position: static;">\
					            <button type="button" class="btn btn-default close-conf-editor">Close</button>\
					        </div>\
					    </div>\
					    <div class="col-md-6" style="">\
					        <div class="form-group">\
					            <label for="legend-column">Legend</label>\
					            <select class="form-control" id="legend-column"></select>\
					            <p class="help-block">Column which describes the data</p>\
					        </div>\
					        <div class="form-group">\
					            <label for="end-column">Last Column</label>\
					            <select class="form-control" id="end-column"></select>\
					            <p class="help-block">Last column to plot data</p>\
					        </div>\
							<label>\
							    <input type="checkbox" id="transpose"> <span>Transpose</span>\
							</label>\
					    </div>\
					</div>\
					</div>\
				</div>\
			</div>\
			</div>')
			.appendTo(window.document.body);
			
		// TODO fix this bug
		this.conf_editor.find(".close, .close-conf-editor").on("click", function() {
			me.conf_editor.remove();
		});
				
		this.chart_type_select = this.conf_editor.find("#chart-type")
			.on("change", function() {
				me.conf.chart_type = $(this).val();
				me.legend_colid_select.prop("disabled", me.conf.chart_type === "Pie");
				me.render_chart(); 
			});
		
		this.start_colid_select = this.conf_editor.find("#start-column")
			.on("change", function() { 
				me.conf.start_colid = parseInt($(this).val() || 0);
				me.render_chart(); 
			});
		
		this.end_colid_select = this.conf_editor.find("#end-column")
			.on("change", function() { 
				me.conf.end_colid = parseInt($(this).val() || 0);
				me.render_chart(); 
			});
		
		this.legend_colid_select = this.conf_editor.find("#legend-column")
			.on("change", function() { 
				me.conf.legend_colid = parseInt($(this).val() || 0);
				me.render_legend(); 
			});
		
		this.head_rowid_select = this.conf_editor.find("#head-row")
			.on("change", function() { 
				me.conf.head_rowid = parseInt($(this).val() || 0);
				me.render_grid();
				me.render_chart();
			});
			
		this.transpose_check = this.conf_editor.find("#transpose")
			.on("click", function() {
				me.conf.transpose = !!$(this).prop("checked");
				me.render_grid();
				me.set_column_selects();
				me.render_chart();
			});
			
		this.set_column_selects();
		
		this.conf_editor.show();
	},
	
	get_csv: function(url) {
		var me = this;
		$.get(url, function(data) {
			if(data[0]=="-") {
				data = data.split("-----\n").slice(2).join("-----\n");
			}
			me.original_data = CSVToArray(data);
			me.set_conf();
			me.render_grid();
			me.set_start_end_colid();
			me.set_chart_width();
			me.render_chart();
		});
	},
	
	set_conf: function(conf) {
		if(!conf) {
			conf = {
				head_rowid: 0,
				selected_rowids: [0, 1, 2],
				start_colid: 0,
				end_colid: 0,
				legend_colid: 0,
				chart_type: "Line"
			};
		}
		this.conf = conf;
	},
	
	get_conf: function() {
		return this.conf;
	},
	
	render_grid: function() {
		var me = this;
		this.transpose();
		this.set_columns();
		this.set_objlist();
		
		this.checkboxSelector = new Slick.CheckboxSelectColumn({
	      cssClass: "slick-cell-checkboxsel"
	    });
		var columns = [this.checkboxSelector.getColumnDefinition()].concat(this.columns);
		
		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false
		};

		this.grid = new Slick.Grid("#slickgrid", this.objlist, columns, options);
		this.grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
		this.grid.registerPlugin(this.checkboxSelector);
		this.grid.setSelectedRows(this.conf.selected_rowids);
		this.grid.getSelectionModel().onSelectedRangesChanged.subscribe(function() {
			me.render_chart();
		});
		
		this.grid_data = this.grid.getData();
	},
	
	set_columns: function() {
		this.columns = [];
		
		var head_row = this.data[this.conf.head_rowid];
		for(var i=0, len=head_row.length; i < len; i++) {
			var name = head_row[i];
			var id = (name || "Column " + i).toLowerCase().replace(/ /g, "_");
			this.columns.push({id: id, name: name, field: id});
		}
	},
	
	set_objlist: function() {
		this.objlist = [];
		for(var ri=(this.conf.head_rowid + 1), rlen=this.data.length; ri<rlen; ri++) {
			var row = {};
			for(var ci=0, clen=this.columns.length; ci < clen; ci++) {
				var val = this.data[ri][ci];
				row[this.columns[ci].field] = val;
				
				if(ci===this.conf.legend_colid) row["rgb"] = this.get_rgb(val).join(",");
				
				// TODO better type identifications
				if(val && !isNaN(val)) this.columns[ci].type = "number";
			}
			this.objlist.push(row);
		}
	},
	
	set_start_end_colid: function() {
		if(this.conf.start_colid || this.conf.end_colid) return;
		var start_colid, end_colid, legend_colid;
		for(var i=0, l=this.columns.length; i<l; i++) {
			if(this.columns[i].type==="number") {
				end_colid = i;
				if(start_colid==null) start_colid = i;
			} else {
				if(legend_colid==null) legend_colid = i;
			}
		}
		start_colid = ((end_colid-start_colid) > 10) ? (end_colid-10) : start_colid;
		this.conf.start_colid = start_colid;
		this.conf.end_colid = end_colid;
		if(!this.conf.legend_colid) this.conf.legend_colid = legend_colid;
	},
	
	set_column_selects: function() {
		var me = this;
		var start_colid, end_colid;
		this.start_colid_select.empty();
		this.end_colid_select.empty();
		this.legend_colid_select.empty();
		for(var i=0, l=this.columns.length; i<l; i++) {
			var name = this.columns[i].name;
			this.start_colid_select.append('<option value="'+i+'">'+name+'</option>');
			if(this.columns[i].type!=="number"){
				this.legend_colid_select.append('<option value="'+i+'">'+name+'</option>');
			}
		}
		this.end_colid_select.html(this.start_colid_select.html());
		this.start_colid_select.val(this.conf.start_colid);
		this.end_colid_select.val(this.conf.end_colid);

		if(this.conf.legend_colid) {this.legend_colid_select.val(this.conf.legend_colid);}
		if(this.conf.chart_type) this.chart_type_select.val(this.conf.chart_type);
		this.transpose_check.prop("checked", !!this.conf.transpose);
		
		var l = this.data.length;
		if(l > 10) l = 10;
		this.head_rowid_select.empty();
		for(var i=0; i<l; i++) {
			this.head_rowid_select.append('<option value="'+i+'">'+this.data[i].join(", ")+'</option>');
		}
		this.head_rowid_select.val(this.conf.head_rowid);
		
		// reverse set values so that if not found in select, it sets correct value in conf
		this.conf.legend_colid = parseInt(this.legend_colid_select.val() || 0);
	},
	
	set_chart_width: function() {
		var $chart = $("#chart");
		$chart.attr("width", $chart.parent().width());
	},

	resize: function() {
		this.set_chart_width();
		this.render_chart();
	},
	
	render_chart: function(opts) {
		if(!this.grid) return;
		if(!opts) opts = {animationSteps: 20};
		this.set_chart_data();
		var context = document.getElementById("chart").getContext("2d");
		this.chart = new Chart(context)[this.conf.chart_type](this.chart_data, opts);
		this.render_legend();
		this.set_grid_height();
	},
	
	set_chart_data: function() {
		var me = this;
		var columns = $.map(this.columns, function(col, i) { 
			return (i>=me.conf.start_colid  && i<=me.conf.end_colid) ? col : null;
		});
		this.conf.selected_rowids = this.grid.getSelectedRows();
		
		if(this.conf.chart_type === "Pie") {
			var row = this.grid_data[this.conf.selected_rowids[0]];
			var dataset = $.map(columns, function(col) {
				var rgb = me.get_rgb(col.field).join(",");
				return {
					value: parseFloat(row[col.field] || 0),
					color: "rgba("+rgb+", 0.5)",
					name: col.name,
					rgb: rgb
				}
			});
			this.chart_data = dataset;
		} else {
			var datasets = $.map(this.conf.selected_rowids, function(rowid) {
				var row = [];
				var data_row = me.grid_data[rowid];
				if(!data_row) return null;
				
				for(var i=0, l=columns.length; i<l; i++) {
					row.push(parseFloat(data_row[columns[i].field] || 0));
				}
				var rgb = me.grid_data[rowid].rgb;
				return {
					fillColor: "rgba("+rgb+",0.5)",
					strokeColor : "rgba("+rgb+",1)",
					pointColor : "rgba("+rgb+",1)",
					pointStrokeColor : "#fff",
					data : row
				};
			});
		
			this.chart_data = {
				labels : $.map(columns, function(v) { return v.name; }),
				datasets : datasets
			};
		}
	},
	
	render_legend: function() {
		var me = this;
		var $legend = $("#legend").empty();
		
		if(this.conf.chart_type === "Pie") {
			$.each(this.chart_data, function(i, d) {
				$legend.append('<div class="row">\
						<div class="legend-circle" style="background-color: rgba('+d.rgb+',0.5); \
							border: 2px solid '+d.color+'"></div>\
						<span>'+d.name+'</span>\
					</div>');
			});
		} else {
			var legend_field = this.columns[this.conf.legend_colid].field;
			
			$.each(this.grid.getSelectedRows(), function(i, rowid) {
				var row = me.grid_data[rowid];
				if(!row) return;
				
				$legend.append('<div class="row">\
						<div class="legend-circle" style="background-color: rgba('+row.rgb+',0.5); \
							border: 2px solid rgb('+row.rgb+')"></div>\
						<span>'+row[legend_field]+'</span>\
					</div>');
			});
		}
	},
	
	set_grid_height: function() {
		var chart_height = $("#chart").parent().height();
		var window_height = $(window).height() - 50;
		if(window_height > chart_height) chart_height = window_height;

		$("#slickgrid").css("height", chart_height).attr("height", chart_height);
		this.grid.resizeCanvas();
	},
	
	transpose: function() {
		this.data = [].concat(this.original_data);
		if(this.conf.transpose) {
			this.data = this._transpose(this.data);
		}
	},

	_transpose: function(a) {
	    return Object.keys(a[0]).map(function (c) {
	        return a.map(function (r) {
	            return r[c];
	        });
	    });
	},
	
	get_rgb: function(str) {
		// str to hash
		for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));

		// int/hash to hex
		for (var i = 0, colour = "#"; i < 3; colour += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice(-2));

		return this.hex_to_rgb(colour);
	},
	
	hex_to_rgb: function(hex) {
		function hexToR(h) {return parseInt((cutHex(h)).substring(0,2),16)}
		function hexToG(h) {return parseInt((cutHex(h)).substring(2,4),16)}
		function hexToB(h) {return parseInt((cutHex(h)).substring(4,6),16)}
		function cutHex(h) {return (h.charAt(0)=="#") ? h.substring(1,7):h}
		
		return [hexToR(hex), hexToG(hex), hexToB(hex)];
	}
});