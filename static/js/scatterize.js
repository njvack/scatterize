var S = function($) {
  var S_my = {}
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
        .strokeStyle("steelblue")
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
    }
    
    my.add_rules = function() {
      pub.vis.add(pv.Rule)
        .data(my.x.ticks())
        .left(my.x);
      pub.vis.add(pv.Rule)
        .data(my.y.ticks())
        .bottom(my.y)
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
  
  S_my.single_state = function(base_url, columns, x_control, y_control) {
    var pub = {}
    var my = {};
    
    my.base_url = base_url;
    my.columns = columns;
    my.x_control = $(x_control);
    my.y_control = $(y_control);

    my.populate_select = function(control, list, initial_index) {
      if (!initial_index) { initial_index = 0; }
      for (i = 0; i < list.length; i++) {
        control.append('<option value="'+i+'">'+list[i]+'</option>');
      }
      control.val(initial_index);
    };
    
    my.populate_select(my.x_control, my.columns, 0);
    my.populate_select(my.y_control, my.columns, 1);
    
    pub.update_controls = function() {
      var cur_state = $.bbq.getState();
      my.x_control.val(cur_state.x);
      my.y_control.val(cur_state.y);
    };
    
    pub.update_state = function() {
      var opts = {
        'x' : my.x_control.val(),
        'y' : my.y_control.val()
      }
      $.bbq.pushState(opts, 2);
    };
    
    pub.get_url = function() {
      return $.param.querystring(my.base_url, $.bbq.getState(), 2);
    };
    
    my.x_control.change(function() { pub.update_state(); });
    my.y_control.change(function() { pub.update_state(); });
    
    pub.my = my;
    return pub;
  };
  
  return S_my;
}(jQuery);
