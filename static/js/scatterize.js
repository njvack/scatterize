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
  
  S_my.scatterplot = function(canvas, w, h) {
    var pub = {};
    var my = {};
    
    my.make_vis = function() {
      pub.vis = new pv.Panel()
        .canvas(canvas)
        .width(w)
        .height(h)
        .bottom(20)
        .top(20)
        .left(20)
        .right(20)
        .def("point_index", null)
        .events("all")
        .event("mousemove", pv.Behavior.point())
        .event("click", function() {console.log(this.point_index());});
    };
    
    pub.set_points = function(points) {
      pub.points = points;
      my.xvals = points.map(function(p) {return p[0]; });
      my.yvals = points.map(function(p) {return p[1]; });
    };
    
    pub.draw_points = function(points) {
      pub.vis.add(pv.Panel)
        .data(points)
      .add(pv.Dot)
        .left(function(p) {return my.x(p[0]);})
        .bottom(function(p) {return my.y(p[1]);})
        .def("strokeStyle", "steelblue")
        .fillStyle(function() { return this.strokeStyle().alpha(0.4);})
        .event("point", function() {
          this.root.point_index(this.parent.index);
          return this.strokeStyle("orange");
          })
        .event("unpoint", function() {
          this.root.point_index(null);
          return this.strokeStyle(undefined);
          });
    };
    
    my.set_scales = function(points) {
      my.x = pv.Scale.linear(pv.min(my.xvals), pv.max(my.xvals)).range(0, w);
      my.y = pv.Scale.linear(pv.min(my.yvals), pv.max(my.yvals)).range(0, h);
    };
    
    pub.regression_line = function(slope, intercept, color) {
      if (!color) { color = "#000"; }
      pub.vis.add(pv.Line)
        .data(my.xvals)
        .strokeStyle(color)
        .bottom(function(xval) { return my.y((slope*xval)+intercept);})
        .left(function(xval) { return my.x(xval);});
      pub.vis.render();
    }
    
    my.add_rules = function() {
      pub.vis.add(pv.Rule)
        .data(my.x.ticks())
        .left(my.x)
        .strokeStyle("#CCC")
      .anchor("bottom").add(pv.Label)
        .text(my.x.tickFormat);
      pub.vis.add(pv.Rule)
        .data(my.y.ticks())
        .bottom(my.y)
        .strokeStyle("#CCC")
      .anchor("left").add(pv.Label)
        .text(my.y.tickFormat);
    }
    
    pub.draw_data = function(points) {
      my.make_vis();
      pub.set_points(points);
      my.set_scales(points);
      my.add_rules();
      pub.draw_points(points)
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

    my.populate_select = function(control, list, initial_index) {
      if (!initial_index) { initial_index = 0; }
      for (i = 0; i < list.length; i++) {
        control.append('<option value="'+i+'">'+list[i]+'</option>');
      }
      control.val(initial_index);
    };
    
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
      console.log($.param.fragment("", opts));
      $.bbq.pushState(opts, 2);
    };
        
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
      out_str = '<input type="checkbox"'+checked_str+dis_str+'id = '+n_str+' value="'+n.i+'" />';
      out_str += '<label for='+n_str+'>'+n.name+'</label>';
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
    c.append("<div>F: "+short_float(model_stats.F)+"</div>");
    c.append("<div>p: "+short_float(model_stats.Fpv)+"</div>");
    c.append("<div>R²: "+short_float(model_stats.Rsq)+"</div>");
    c.append("<div>Adj. R²: "+short_float(model_stats.RsqAdj)+"</div>");
  }
  S_my.update_model_stats = update_model_stats;
  
  function update_coef_stats(container, coef_stats) {
    sc = $(container).find(".stats");
    if (sc.length === 0) {
      sc = $(document.createElement("div")).addClass("stats");
      $(container).append(sc);
    } else {
      sc = $(sc[0]);
      sc.empty();
    }
    sc.append("<div>β: "+short_float(coef_stats.b)+"</div>");
    sc.append("<div>t: "+short_float(coef_stats.t)+"</div>");
    sc.append("<div>p: "+short_float(coef_stats.p)+"</div>");
    
  }
  S_my.update_coef_stats = update_coef_stats;
  
  return S_my;
}(jQuery);
