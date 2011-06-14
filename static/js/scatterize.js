if (!(window.console && window.console.log)) {
  window.console = {
    log: function() {}
  }
}

var S = function($) {
  var S_my = {};
  
  function intify(string_ar) {
    return $.map(string_ar, function(e) {
      return parseInt(e, 10);
    });
  }
  S_my.intify = intify;
  
  function short_float(val, places) {
    if (!places) { places = 4; }
    return parseFloat(val).toFixed(places);
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
    my.right_margin = 10;
    my.ylabel_width = 40;
    my.xlabel_height = 40;
    my.state_mgr = state_mgr;
    my.pad_frac = 0.1; // We'll extend the range by this much.
    my.formatter = pv.Format.number().fractionDigits(2);
    
    my.ifhov = function(p, val1, val2) {
      if (val1 === undefined) { val1 = true; val2 = false; }
      if (p.parent.index === p.root.hover_index()) {
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
      pub.points = points;
      my.xvals = points.map(function(p) {return p[0]; });
      my.yvals = points.map(function(p) {return p[1]; });
    };
    
    pub.draw_points = function(points) {
      var point_panel = pub.vis.add(pv.Panel)
        .data(points)
      .add(pv.Dot)
        .left(function(p) {return my.x(p[0]);})
        .bottom(function(p) {return my.y(p[1]);})
        .def("strokeStyle", function(p) {
          return my.ifhov(this, "orange", my.c(p[2]));
        })
        .fillStyle(function() { return this.strokeStyle().alpha(0.4);})
        .event("point", function() {
          my.state_mgr.hover_index = this.parent.index;
          this.root.hover_index(this.parent.index);
          this.parent.render();
          })
        .event("unpoint", function() {
          my.state_mgr.hover_index = null;
          this.root.hover_index(null);
          this.parent.render();
          });
          
        // Datapoint ticks for X
        point_panel.add(pv.Rule)
          .bottom(1)
          .height(function() {return my.ifhov(this, 10, 6);})
          .left(function(p) {return my.x(p[0]);})
          .def("strokeStyle", function(p) {
            return my.ifhov(this, "#000", "#999");
          })
        .anchor("top").add(pv.Label)
          .visible(function() {return my.ifhov(this);})
          .text(function(p) {return my.formatter(p[0]);});
        
        // Datapoint ticks for Y
        point_panel.add(pv.Rule)
          .left(1)
          .width(function() {return my.ifhov(this, 10, 6);})
          .bottom(function(p) {return my.y(p[1]);})
          .def("strokeStyle", function(p) { 
            return my.ifhov(this, "#000", "#999");
          })
        .anchor("right").add(pv.Label)
          .visible(function() {return my.ifhov(this);})
          .text(function(p) {return my.formatter(p[1]);});
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
        .bottom(my.y(ymed)-5)
        .height(10);

      // And y labels
      var yticks = my.yqs.quantiles();
      yticks.push(ymed);
      console.log(yticks);
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
        .left(my.x(xmed)-5)
        .width(10);

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
      base_url, columns, x_control, y_control, nuisance_list) {
    var pub = {}
    var my = {};
    
    my.base_url = base_url;
    my.columns = columns;
    my.x_control = $(x_control);
    my.y_control = $(y_control);
    my.nuisance_list = $(nuisance_list);
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
      };
      var xy_ints = intify([my.x_control.val(), my.y_control.val()]);
      var nuisance_ids = $.grep(my.checked_nuisance_vals(), function(v) {
        return !(xy_ints.indexOf(v) > -1)
      });
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
      console.log("Update controls");
      var cur_state = $.bbq.getState();
      console.log(cur_state);
      my.x_control.val(cur_state.x);
      my.y_control.val(cur_state.y);
      my.populate_nuisance_lists();
    };
    
    pub.get_url = function() {
      return $.param.querystring(my.base_url, $.bbq.getState(), 2);
    };
    
    my.x_control.change(function() { pub.update_state(); });
    my.y_control.change(function() { pub.update_state(); });
    
    pub.my = my;
    return pub;
  };
  
  function update_model_stats(container, model_stats) {
    var c = $(container);
    c.empty();
    c.append("<h3>Model fit</h3>");
    c.append("<table>");
    c.append("<tr><th>F:</th><td>"+short_float(model_stats.F)+"</td></tr>");
    c.append("<tr><th>p:</th><td>"+short_float(model_stats.Fpv)+"</td></tr>");
    c.append("<tr><th>R²:</th><td>"+short_float(model_stats.Rsq)+"</td></tr>");
    c.append("<tr><th>Adj. R²:</th><td>"+short_float(model_stats.RsqAdj)+"</td></tr>");
    c.append("</table>");
  }
  S_my.update_model_stats = update_model_stats;
  
  function update_coef_stats(container, coef_stats) {
    sc = $(container);
    sc.empty();
    sc.append("<h3>"+add_breaks(coef_stats.name)+"</h3>");
    sc.append("<table>");
    sc.append("<tr><th>β:</th><td>"+short_float(coef_stats.b)+"</td></tr>");
    sc.append("<tr><th>t:</th><td> "+short_float(coef_stats.t)+"</td></tr>");
    sc.append("<tr><th>p:</th><td> "+short_float(coef_stats.p)+"</td></tr>");
    sc.append("</table>");
  }
  S_my.update_coef_stats = update_coef_stats;
  
  return S_my;
}(jQuery);
