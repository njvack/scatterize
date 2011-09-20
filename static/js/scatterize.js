/* 
 * Part of scatterize -- a statistical exploration tool
 *
 * Copyright (c) 2011 Board of Regents of the University of Wisconsin System
 * 
 * scatterize is licensed under the GPLv3 -- see LICENSE for details.
 *
 * Written by Nathan Vack <njvack@wisc.edu> at the Waisman Laborotory
 * for Brain Imaging and Behavior, University of Wisconsin - Madison.
 *
 * Color schemes from the excellent ColorBrewer tool: http://colorbrewer2.org/
 *
 * Chart designs inspired by Edward Tufte's (also excellent) "The Visual 
 * Display of Quantitative Data"
 * 
 */
if (!(window.console && window.console.log)) {
  window.console = {
    log: function() {}
  }
}

var S = function($) {
  var S_my = {};
  
  // From colorbrewer2.org, "paired"
  S_my.colors = pv.colors(
    "rgb(31, 120, 180)", // blue
    "rgb(51, 190, 77)", // green
    "rgb(183, 5, 7)", // red
    "rgb(255, 127, 0)", // orange
    "rgb(166, 206, 227)", // lightblue
    "rgb(178, 223, 138)", // lightgreen
    "rgb(251, 154, 153)", // lightred
    "rgb(253, 191, 111)" // lightorange
  );
  
  function intify(string_ar) {
    return $.map(string_ar, function(e) {
      return parseInt(e, 10);
    });
  }
  S_my.intify = intify;
  
  function short_float(val, places) {
    if (!places) { places = 4; }
    var vf = parseFloat(val),
      exponent = Math.abs(Math.log(Math.abs(val))/Math.log(10)),
      out_str = vf.toFixed(places);
    
    if (exponent >= places) { out_str = vf.toExponential(places-1); }
    
    return out_str;
  }
  
  function csv_split(str) {
    var splitted = []
    if (str && str !== "") {
     splitted = str.split(",") 
    }
    return intify(splitted);
  }
  S_my.csv_split = csv_split;
  
  var underscore_regex = new RegExp("_", "g");
  var break_regex = new RegExp("([a-z])([^a-z 0-9])", "g");
  function add_breaks(s) {
    var replaced = s.replace(underscore_regex, " ");
    return replaced.replace(break_regex, "$1&#8203;$2");
  }
  S_my.add_breaks = add_breaks;
  
  S_my.scatterplot = function(canvas, w, h, state_mgr) {
    var pub = {};
    var my = {};
    my.bottom_margin = 60;
    my.left_margin = 60;
    my.top_margin = 10;
    my.right_margin = 20;
    my.ylabel_width = 40;
    my.xlabel_height = 40;
    my.state_mgr = state_mgr;
    my.pad_frac = 0.1; // We'll extend the range by this much.
    my.formatter = pv.Format.number().fractionDigits(2);
    
    my.ifhov = function(p, val1, val2) {
      if (val1 === undefined) { val1 = true; val2 = false; }
      if (p.parent.row_id() === p.root.hover_index()) {
        return val1;
      }
      return val2;
    };
    
    my.make_vis = function() {
      pub.vis = new pv.Panel()
        .canvas(canvas)
        .width(w)
        .height(h)
        .bottom(my.bottom_margin)
        .top(my.top_margin)
        .left(my.left_margin)
        .right(my.right_margin)
        .def("hover_index", my.state_mgr.hover_index)
        .events("all")
        .event("mousemove", pv.Behavior.point())
        .event("click", function() {
          my.state_mgr.toggle_point(this.hover_index());
        });
    };
    
    pub.set_points = function(points) {
      var the_point;
      pub.points = points;
      for (var i = 0; i < points.length; i++) {
        the_point = points[i];
        the_point.row_id = the_point[0];
        the_point.x = the_point[1];
        the_point.y = the_point[2];
        the_point.weight = the_point[3];
        the_point.group_id = the_point[4];
      }
      my.xvals = points.map(function(p) {return p.x; });
      my.yvals = points.map(function(p) {return p.y; });
    };
    
    my.draw_point_group = function(points, color_scale) {
      var point_panel = pub.vis.add(pv.Panel)
        .data(points)
      .add(pv.Panel)
        .def("row_id", function(p) {return p.row_id; })
      .add(pv.Dot)
        .left(function(p) {return my.x(p.x);})
        .bottom(function(p) {return my.y(p.y);})
        .def("strokeStyle", function(p) {
          return my.ifhov(this, "orange", color_scale(p.weight));
        })
        .fillStyle(function() { return this.strokeStyle().alpha(0.4);})
        .event("point", function() {
          my.state_mgr.hover_index = this.parent.row_id();
          this.root.hover_index(this.parent.row_id());
          this.root.render();
          })
        .event("unpoint", function(p) {
          my.state_mgr.hover_index = null;
          this.root.hover_index(null);
          this.root.render();
          });
      
        // Datapoint ticks for X
        point_panel.add(pv.Rule)
          .bottom(1)
          .height(function() {return my.ifhov(this, 10, 6);})
          .left(function(p) {return my.x(p.x);})
          .def("strokeStyle", function(p) {
            return my.ifhov(this, "rgba(0,0,0,1)", "rgba(0,0,0,0.25)");
          })
        .anchor("top").add(pv.Label)
          .visible(function() {return my.ifhov(this);})
          .text(function(p) {return my.formatter(p.x);});
      
        // Datapoint ticks for Y
        point_panel.add(pv.Rule)
          .left(1)
          .width(function() {return my.ifhov(this, 10, 6);})
          .bottom(function(p) {return my.y(p.y);})
          .def("strokeStyle", function(p) { 
            return my.ifhov(this, "rgba(0,0,0,1)", "rgba(0,0,0,0.25)");
          })
        .anchor("right").add(pv.Label)
          .visible(function() {return my.ifhov(this);})
          .text(function(p) {return my.formatter(p.y);});
    };
    
    pub.draw_points = function(points) {
      var point_groups = pv.uniq(points.map(function(p) {return p.group_id; }));
      var i;
      var color_scales = []
      for (i=0; i < point_groups.length; i++) {
        var color_index = (i%S.colors.range().length);
        var group_color_scale = pv.Scale.linear(1,0).range(
          S.colors.range()[color_index], 'lightgrey');
        var filtered_points = points.filter(function(p) {
          return p[4] === point_groups[i];
        });
        my.draw_point_group(filtered_points, group_color_scale);
      }
    };
    
    my.set_scales = function(points) {
      var xmin = pv.min(my.xvals),
        ymin = pv.min(my.yvals),
        xmax = pv.max(my.xvals),
        ymax = pv.max(my.yvals);
      
      var xrange = xmax-xmin;
      var yrange = ymax-ymin;
      var xpad = my.pad_frac * xrange;
      var ypad = my.pad_frac * yrange;
      
      my.x = pv.Scale.linear(xmin-xpad, xmax).range(0, w);
      my.y = pv.Scale.linear(ymin-ypad, ymax).range(0, h);
      my.c = pv.Scale.linear(0, 1).range("lightgrey", "steelblue");
    };
    
    pub.regression_line = function(slope, intercept, color) {
      if (!color) { color = "#000"; }
      var xextrema = my.x.range().map(function(v) { return my.x.invert(v);});
      pub.vis.add(pv.Line)
        .data(xextrema)
        .strokeStyle(color)
        .bottom(function(xval) { return my.y((slope*xval)+intercept);})
        .left(function(xval) { return my.x(xval);});
      pub.vis.render();
    }
    
    my.add_rules = function() {
      
      // Draw and label quartile plots on X and Y.
      my.xqs = pv.Scale.quantile(my.xvals).quantiles(3);
      var xqr = my.xqs.quantiles().map(function(v) { return my.x(v);});
      my.yqs = pv.Scale.quantile(my.yvals).quantiles(3);
      var yqr = my.yqs.quantiles().map(function(v) {return my.y(v);});
      var xmed = pv.median(my.xvals);
      var ymed = pv.median(my.yvals);

      // Y axis
      pub.vis.add(pv.Rule)
        .data([yqr[0], yqr[1]])
        .left(0)
        .bottom(yqr[0])
        .height(yqr[1]-yqr[0]);
      pub.vis.add(pv.Rule)
        .left(1)
        .bottom(yqr[1])
        .height(yqr[2]-yqr[1]);
      pub.vis.add(pv.Rule)
        .left(0)
        .bottom(yqr[2])
        .height(1+yqr[3]-yqr[2]); // Mind the gap!
      
      // Add a little gap for the median
      pub.vis.add(pv.Rule)
        .left(1)
        .strokeStyle("#FFF")
        .bottom(my.y(ymed)-2)
        .height(4);

      // And y labels
      var yticks = my.yqs.quantiles();
      yticks.push(ymed);
      pub.vis.add(pv.Rule)
        .data(yticks)
        .bottom(my.y)
        .strokeStyle("None")
      .anchor("left").add(pv.Label)
        .text(my.formatter);
      
      // X axis
      pub.vis.add(pv.Rule)
        .data([xqr[0], xqr[1]])
        .bottom(0)
        .left(xqr[0])
        .width(xqr[1]-xqr[0]);
      pub.vis.add(pv.Rule)
        .bottom(1)
        .left(xqr[1])
        .width(xqr[2]-xqr[1]);
      pub.vis.add(pv.Rule)
        .bottom(0)
        .left(xqr[2])
        .width(1+xqr[3]-xqr[2]); // Fix the corner
      
      // Add a little gap for the median
      pub.vis.add(pv.Rule)
        .bottom(1)
        .strokeStyle("#FFF")
        .left(my.x(xmed)-2)
        .width(4);

      // And y labels
      var xticks = my.xqs.quantiles();
      xticks.push(xmed);
      pub.vis.add(pv.Rule)
        .data(xticks)
        .left(my.x)
        .strokeStyle("None")
      .anchor("bottom").add(pv.Label)
        .text(my.formatter);
    }
    
    pub.add_labels = function(xlabel, ylabel) {
      pub.vis.add(pv.Panel)
        .bottom(-my.bottom_margin)
        .height(my.xlabel_height)
        .anchor("center")
      .add(pv.Label)
        .font("14px sans-serif")
        .text(xlabel);
      
      pub.vis.add(pv.Panel)
        .left(-my.left_margin)
        .width(my.ylabel_width)
        .anchor("center")
      .add(pv.Label)
        .font("14px sans-serif")
        .textAngle(-Math.PI/2)
        .text(ylabel);
    }
    
    pub.draw_data = function(points) {
      my.make_vis();
      pub.set_points(points);
      my.set_scales(points);
      pub.draw_points(points)
      my.add_rules();
      pub.vis.render();
    }
    
    pub.my = my; // debugging fun
    return pub;
  };
  
  S_my.single_state = function(
      regress_js_url, regress_csv_url, columns, x_control, y_control, 
      highlight_control, nuisance_list, model_control) {
    var pub = {}
    var my = {};
    
    my.base_url = regress_js_url;
    my.regress_csv_url = regress_csv_url;
    my.columns = columns;
    my.x_control = $(x_control);
    my.y_control = $(y_control);
    my.highlight_control = $(highlight_control);
    my.nuisance_list = $(nuisance_list);
    my.model_control = $(model_control);
    my.censored_points = [];

    my.populate_select = function(control, list, initial_index) {
      if (!initial_index) { initial_index = 0; }
      for (i = 0; i < list.length; i++) {
        control.append('<option value="'+i+'">'+list[i]+'</option>');
      }
      control.val(initial_index);
    };
    
    pub.toggle_point = function(rownum) {
      if (!isFinite(parseInt(rownum, 10))) {
        console.log("Ooh, not numeric: " + rownum);
        return; 
      }
      var cpi = my.censored_points.indexOf(rownum);
      if (cpi > -1) {
        my.censored_points.splice(cpi, 1);
      } else {
        my.censored_points.push(rownum);
      }
      my.censored_points = my.censored_points.sort();
      console.log(my.censored_points);
      pub.update_state();
    }
    
    pub.update_state = function() {
      console.log("Updating state!");
      var opts = {
        'x' : my.x_control.val(),
        'y' : my.y_control.val(),
        'm' : my.model_control.val()
      };
      var xy_ints = intify([my.x_control.val(), my.y_control.val()]);
      var nuisance_ids = $.grep(my.checked_nuisance_vals(), function(v) {
        return !(xy_ints.indexOf(v) > -1)
      });
      var highlight_idx = my.highlight_control.val();
      if (highlight_idx !== "") {
        opts.h = highlight_idx;
      }
      var nuisance_list = nuisance_ids.join(",");
      if (nuisance_list !== '') { opts.n = nuisance_list; }
      var censor_list = my.censored_points.join(",");
      if (censor_list !== '') { opts.c = censor_list; }
      console.log($.param.fragment("", opts));
      $.bbq.pushState(opts, 2);
    };
    
    pub.x_var_name = function() {
      var xidx = parseInt(my.x_control.val(), 10);
      return columns[xidx];
    }
    
    pub.y_var_name = function() {
      var yidx = parseInt(my.y_control.val(), 10);
      return columns[yidx];
    }
    
    pub.nuisance_var_names = function() {
      var names = [];
      var nuisances = my.checked_nuisance_vals();
      for (var i = 0; i < nuisances.length; i++) {
        names.push(columns[nuisances[i]]);
      }
      return names;
    }
        
    my.generate_nuisance_list = function() {
      var st = $.bbq.getState();
      var nuis_idxs = csv_split(st.n);
      var xy_idxs = intify([st.x, st.y]);
      var col_list_decorated = my.decorate_column_list_selectable(
        my.columns, xy_idxs, nuis_idxs);
      return col_list_decorated;
    };
    
    my.populate_nuisance_lists = function() {
      var list = my.generate_nuisance_list();
      my.nuisance_list.empty();
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var li = $(document.createElement("li"));
        if (!item.allowed) { li.addClass("disallowed"); }
        my.nuisance_list.append(li.append(my.make_nuisance_selector(item)));
      }
      my.nuisance_list.find("input").change(function() {
        pub.update_state();
      });
    };
    
    my.checked_nuisance_vals = function() {
      var l = [];
      var checked = my.nuisance_list.find("input:checked");
      $.each(checked, function(i, elt) { l.push(elt.value); });
      return intify(l).sort();
    };
    
    my.decorate_column_list_selectable = function(
        columns, disallowed_idxs, selected_idxs) {
      var disalloweds = S.intify(disallowed_idxs);
      var selecteds = S.intify(selected_idxs);
      
      var out = [];
      for (var i = 0; i < columns.length; i++) {
        var name = columns[i];
        var allowed = !(disalloweds.indexOf(i) > -1);
        var selected = allowed && (selecteds.indexOf(i) > -1);
        out.push({name:name, i: i, allowed: allowed, selected: selected});
      }
      return out;
    };
    
    my.make_nuisance_selector = function(n) {
      // Makes something like 
      // <input type="checkbox" id="n_X" name="n_X" value="X" />
      // <label for="n_X">Column name</label>
      var dis_str = ' disabled="disabled" ';
      if (n.allowed) { dis_str = ' '; }
      var checked_str = ' ';
      if (n.selected) { checked_str = ' checked = "checked" '; }
      var n_str = '"n_'+n.i+'"';
      out_str = '<div class="l"><input type="checkbox"'+checked_str+dis_str+'id = '+n_str+' value="'+n.i+'" /></div>';
      out_str += '<label for='+n_str+'>'+add_breaks(n.name)+'</label>';
      return out_str;
    }
    
    my.populate_select(my.x_control, my.columns, 0);
    my.populate_select(my.y_control, my.columns, 0);
    
    pub.update_controls = function() {
      // Update the controls on the page and our internal tracking of
      // censored points from the URL hash
      console.log("Update controls");
      var cur_state = $.bbq.getState();
      console.log(cur_state);
      my.x_control.val(cur_state.x);
      my.y_control.val(cur_state.y);
      my.highlight_control.val(cur_state.h || "");
      my.model_control.val(cur_state.m)
      my.populate_nuisance_lists();
      var cstr = cur_state.c || "";
      var clist = [];
      if (cstr !== "") {
        clist = intify(cstr.split(","));
      }
      my.censored_points = clist;
    };
    
    pub.get_url = function() {
      return $.param.querystring(my.base_url, $.bbq.getState(), 2);
    };
    
    pub.get_csv_url = function() {
      return $.param.querystring(my.regress_csv_url, $.bbq.getState(), 2);
    };
    
    my.x_control.change(function() { pub.update_state(); });
    my.y_control.change(function() { pub.update_state(); });
    my.highlight_control.change(function() { pub.update_state(); });
    my.model_control.change(function() { pub.update_state(); });
    
    pub.my = my;
    return pub;
  };
  
  function update_stats_diags(container, diag_data) {
    var c = $(container), de, dv, opts;
    c.empty();
    for (var i=0; i < diag_data.length; i++) {
      de = diag_data[i];
      c.append("<h3>"+de.title+"</h3>");
      c.append("<table>");
      for (var j = 0; j < de.data.length; j++) {
        dv = de.data[j];
        opts = dv[2] || {};
        if (!opts.hide) {
          c.append(
            "<tr><th>"+format_stats_name(dv[0])+":</th><td>"+
            short_float(dv[1])+"</td></tr>");
        }
      }
      c.append("</table>");
    }
  };
  S_my.update_stats_diags = update_stats_diags;
  
  S_my.STATS_DISPLAY = {
    'Rsq': 'R&sup2;',
    'RsqAdj': 'Adj. R&sup2;',
    'b': '&beta;'
  }
  
  format_stats_name = function(key) {
    return (S_my.STATS_DISPLAY[key] || key);
  };
  
  return S_my;
}(jQuery);
