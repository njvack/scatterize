/*jslint devel: true, browser: true, white: true, maxerr: 50, indent: 4 */
if (!('console' in window && 'log' in window.console)) {
  window.console = {};
  window.console.log = function() {};
}

var S2 = function ($, d3) {
  "use strict";
  var S_my = {};

  // From colorbrewer2.org, "paired"
  S_my.colors = [
    d3.rgb(31, 120, 180), // blue
    d3.rgb(51, 190, 77), // green
    d3.rgb(183, 5, 7), // red
    d3.rgb(255, 127, 0), // orange
    d3.rgb(166, 206, 227), // lightblue
    d3.rgb(178, 223, 138), // lightgreen
    d3.rgb(251, 154, 153), // lightred
    d3.rgb(253, 191, 111) // lightorange
  ];

  S_my.color_scales = d3.scale.ordinal()
    .domain([0,1,2,3,4,5,6,7])
    .range(S_my.colors.map( function (c) {
      return d3.scale.linear()
        .domain([0,1])
        .range(['lightgrey', c]);
      }));

  function intify(string_ar) {
    return $.map(string_ar, function (e) {
      return parseInt(e, 10);
    });
  }
  S_my.intify = intify;

  function nice_num(val, places) {
    if (!places) { places = 4; }
    var vf = parseFloat(val),
      exponent = Math.abs(Math.log(Math.abs(val))/Math.log(10)),
      out_str = vf.toFixed(places);
    if (vf % 1 === 0) { out_str = String(val); }
    if (exponent >= places) { out_str = vf.toExponential(places-1); }

    return out_str;
  }

  function csv_split(str) {
    var splitted = [];
    if (str && str !== "") {
     splitted = str.split(",");
    }
    return intify(splitted);
  }
  S_my.csv_split = csv_split;

  function add_breaks(s) {
    var underscore_regex = new RegExp("_", "g"),
      break_regex = new RegExp("([a-z])([^a-z 0-9])", "g"),
      replaced = s.replace(underscore_regex, " ");
    return replaced.replace(break_regex, "$1&#8203;$2");
  }
  S_my.add_breaks = add_breaks;

  S_my.scatterplot = function(container,
      data_width,
      data_height,
      top_outer_margin,
      right_outer_margin,
      axis_margin,
      label_width,
      x_label_margin,
      y_label_margin,
      colormap) {

    var my = {},
      pub = {},
      svg = d3.select(container).append('svg:svg');

    // initialization code
    my.data_width = data_width;
    my.data_height = data_height;
    my.top_outer_margin = top_outer_margin;
    my.right_outer_margin = right_outer_margin;
    my.label_width = label_width;
    my.axis_margin = axis_margin;
    my.x_label_margin = x_label_margin;
    my.y_label_margin = y_label_margin;
    my.colormap = colormap;
    my.height = (top_outer_margin + my.data_height +
      2*my.axis_margin + my.label_width + my.x_label_margin);
    my.width = (right_outer_margin + my.data_width +
      2*my.axis_margin + my.label_width + my.y_label_margin);
    my.data_canvas_trans_y = my.top_outer_margin;
    my.data_canvas_trans_x = my.x_label_margin + my.label_width + 2*my.axis_margin;
    my.duration = 333;

    my.event = d3.dispatch("point");

    svg.attr('height', my.height)
      .attr('width', my.width)
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-family', 'Corbel, Helvetica, sans-serif');

    my.data_canvas = svg.append('svg:g')
      .attr('transform', 'translate('+my.data_canvas_trans_x+','+my.data_canvas_trans_y+')')
      .attr('id', 'data-canvas');

    my.datapoint_canvas = my.data_canvas.append('svg:g')
      .attr('id', 'datapoint-canvas');

    // ensure there's always a 0th group
    my.group_canvases = [
      my.datapoint_canvas.append('svg:g')
        .attr('id', 'point-group-0').node()];

    my.regression_canvas = my.data_canvas.append('svg:g')
      .attr('id', 'regression-canvas');

    my.yaxis_canvas = my.data_canvas.append('svg:g')
      .attr('transform', 'translate('+ -my.axis_margin +')')
      .attr('id', 'y-axis');

    my.ytick_canvas = my.yaxis_canvas.append('svg:g')
      .attr('id', 'ytick-layer');

    my.yaxis_canvas.append('svg:line')
      .attr('id', 'y-axis-frame')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', -1)
      .attr('y2', my.data_height)
      .attr('stroke', 'black')
      .attr('stroke-width', '1')
      .attr('shape-rendering', 'crispEdges');

    my.xaxis_canvas = my.data_canvas.append('svg:g')
      .attr('transform', 'translate(0, '+ (my.data_height+my.axis_margin)+')')
      .attr('id', 'x-axis');

    my.xtick_canvas = my.xaxis_canvas.append('svg:g')
      .attr('id', 'xtick-layer');

    my.xaxis_canvas.append('svg:line')
      .attr('id', 'x-axis-frame')
      .attr('x1', 0)
      .attr('x2', my.data_width+1)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', 'black')
      .attr('stroke-width', '1')
      .attr('shape-rendering', 'crispEdges');

    my.pointed = d3.select(null);

    my.data_click_wrapper = function() {
      if (my.click_handler) {
        my.click_handler(my.pointed);
      }
    };
    my.click_handler = null;

    my.point_target_canvas = my.data_canvas.append('svg:g')
      .attr('id', 'point-target-canvas');

    // label placement
    my.xlabel_text = svg.append('svg:g')
      .attr('transform', ('translate('+(my.width/2)+', '+( 14+
        my.data_height+my.axis_margin+(2*my.x_label_margin)+my.label_width)+')'))
      .style('font-size', '14px')
      .append('svg:text');

    my.ylabel_text = svg.append('svg:g')
      .attr('transform', 'translate(18,'+my.data_height/2+') rotate(-90)')
      .style('font-size', '14px')
      .append('svg:text');

    pub.update = function(points, regression, xlabel, ylabel, groups,
        model_type, x_labels, y_labels) {
      // maybe the only public function?

      my.set_points(points);
      my.set_scales(points, x_labels, y_labels);
      my.set_regression(regression);
      my.set_groups(groups);
      my.set_model_type(model_type);
      my.draw_regression();
      my.draw_dots();
      my.draw_point_targets();
      my.draw_axes();
      my.draw_axis_labels(xlabel, ylabel);
      my.draw_group_labels();
    };

    my.set_points = function(points) {
      my.point_data = points.map(function(p) {
        return {
          'row_id':p[0], 'x':p[1], 'y':p[2], 'weight':p[3], 'group':p[4]};});
      my.xvals = my.point_data.map(function(p) { return p.x; });
      my.yvals = my.point_data.map(function(p) { return p.y; });
      my.x_sorted = my.xvals.slice().sort(d3.ascending);
      my.y_sorted = my.yvals.slice().sort(d3.ascending);
    };

    my.valid_labels = function(labels) {
      var ok = labels && labels.length > 1 && labels.every;
      return ok && labels.every(function(v) { return !isNaN(+v) });
    }

    my.set_scales = function(points, x_labels, y_labels) {
      my.x_label_values = x_labels;
      my.y_label_values = y_labels;
      var quantiles = [0, 0.25, 0.5, 0.75, 1];
      if (!my.valid_labels(x_labels)) {
        // use quartiles
        my.x_label_values = quantiles.map(function(q) {
          return d3.quantile(my.x_sorted, q);});
      }
      if (!my.valid_labels(y_labels)) {
        // use quartiles
        my.y_label_values = quantiles.map(function(q) {
          return d3.quantile(my.y_sorted, q);});
      }
      my.x_label_values = my.x_label_values.sort(d3.ascending);
      my.y_label_values = my.y_label_values.sort(d3.ascending);

      my.x_scale = d3.scale.linear()
        .domain(
          [d3.first(my.x_label_values), d3.last(my.x_label_values)])
        .range([0, my.data_width]);

      my.y_scale = d3.scale.linear()
        .domain(
          [d3.first(my.y_label_values), d3.last(my.y_label_values)])
        .range([my.data_height, 0]);
    };

    my.set_groups = function(groups) {
      my.groups = groups;

      groups.forEach(function(group, i) {
        if (!my.group_canvases[i]) {
          my.group_canvases[i] = my.datapoint_canvas.append('svg:g')
            .attr('id', 'point-group-'+i).node();
        }
      });
    };

    my.set_model_type = function(mtype) {
      my.model_type = mtype;
    };

    my.draw_dots = function() {
      var dots;
      dots = my.datapoint_canvas.selectAll('circle')
        .data(my.point_data, function(d) { return d.row_id; });

      dots.enter().append('svg:circle')
        .attr('cx', function(d) { return my.x_scale(d.x); })
        .attr('cy', function(d) { return my.y_scale(d.y); })
        .attr('r', 4);

      // Coloring should be instantaneous -- no transition here
      dots
        .attr('id', function(d) { return 'datapoint-'+d.row_id; })
        .style('stroke', function(d) { return my.colormap(d.group)(d.weight); })
        .style('fill', function(d) { return my.colormap(d.group)(d.weight); })
        .style('fill-opacity', 0.4)
        .each(function(d) {
          // Move this scg:
          my.group_canvases[d.group].appendChild(this);
        });

      my.pointed.style('fill', 'orange').style('stroke', 'orange');

      dots.transition()
        .sort(function(d) { return d.x; })
        .duration(my.duration)
        .attr('cx', function(d) { return my.x_scale(d.x); })
        .attr('cy', function(d) { return my.y_scale(d.y); });

      dots.exit()
        .remove();
    }; // draw_dots()

    my.set_regression = function(params) {
      if (params) {
        my.regression_params = [params]; // makes .data() work properly
      } else {
        my.regression_params = [];
      }
    };

    my.draw_regression = function() {
      var x1, x2, line, model_line_attrs, line_attrs;

      model_line_attrs = {
        'default': [['stroke-dasharray', 'none']],
        'SR': [['stroke-dasharray', '10']]
      };

      line_attrs = model_line_attrs[my.model_type] ||
        model_line_attrs['default'];

      x1 = d3.first(my.x_label_values);
      x2 = d3.last(my.x_label_values);

      line = my.regression_canvas.selectAll('line#regression-line')
        .data(my.regression_params);

      line.enter().append('svg:line')
        .attr('id', 'regression-line')
        .attr('x1', my.x_scale(x1))
        .attr('y1', function(d) { return my.y_scale(d['const'] + x1*d.slope); })
        .attr('x2', my.x_scale(x2))
        .attr('y2', function(d) { return my.y_scale(d['const'] + x2*d.slope); });

      line
        .attr('stroke', 'brown')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');

      line_attrs.forEach(function(akv) {
        line.attr(akv[0], akv[1]);
      });

      line.transition()
        .duration(my.duration)
        .attr('x1', my.x_scale(x1))
        .attr('y1', function(d) { return my.y_scale(d['const'] + x1*d.slope); })
        .attr('x2', my.x_scale(x2))
        .attr('y2', function(d) { return my.y_scale(d['const'] + x2*d.slope); });

      line.exit()
        .remove();
    };

    my.draw_axes = function() {
      var xticks, yticks, x_sorted, y_sorted, quantiles, xquant, yquant,
        xlabels, ylabels;

      xticks = my.xtick_canvas.selectAll("line.tick")
        .data(my.point_data, function(d) { return d.row_id; });

      xticks.enter().append('svg:line')
        .attr('class', 'tick')
        .attr('x1', function(d) { return my.x_scale(d.x); })
        .attr('x2', function(d) { return my.x_scale(d.x); })
        .attr('y1', 0)
        .attr('y2', -7)
        .attr('stroke', 'black')
        .attr('stroke-opacity', 0.2);

      xticks.transition()
        .duration(my.duration)
        .attr('x1', function(d) { return my.x_scale(d.x); })
        .attr('x2', function(d) { return my.x_scale(d.x); });

      xticks.exit()
        .remove();

      yticks = my.ytick_canvas.selectAll("line.tick")
        .data(my.point_data, function(d) { return d.row_id; });

      yticks.enter().append('svg:line')
        .attr('class', 'tick')
        .attr('y1', function(d) { return my.y_scale(d.y); })
        .attr('y2', function(d) { return my.y_scale(d.y); })
        .attr('x1', 0)
        .attr('x2', 7)
        .attr('stroke', 'black')
        .attr('stroke-opacity', 0.2);

      yticks.transition()
        .duration(my.duration)
        .attr('y1', function(d) { return my.y_scale(d.y); })
        .attr('y2', function(d) { return my.y_scale(d.y); });

      yticks.exit()
        .remove();

      // Now we add quantile labels
      my.xaxis_canvas.selectAll("g.label").remove();
      xlabels = my.xaxis_canvas.selectAll("g.label")
        .data(my.x_label_values);

      xlabels.enter().append("svg:g")
        .attr('class', 'label')
        .attr('transform', function(d) {
          return 'translate('+my.x_scale(d)+', 10)';})
        .append('svg:text');

      xlabels.selectAll('text').text(function(d) {return d.toFixed(2); });

      xlabels.transition()
        .duration(my.duration)
        .attr('transform', function(d) {
          return 'translate('+my.x_scale(d)+', 10)';})
        .select('text').text(function(d) {return d.toFixed(2); });

      my.yaxis_canvas.selectAll("g.label").remove();
      ylabels = my.yaxis_canvas.selectAll("g.label")
        .data(my.y_label_values);

      ylabels.enter().append("svg:g")
        .attr('class', 'label')
        .attr('transform', function(d) {
          return 'translate(-20, '+my.y_scale(d)+')';})
        .append('svg:text');

      ylabels.selectAll('text')
        .text(function(d) {return d.toFixed(2); })
        .style('dominant-baseline', 'middle');

      ylabels.transition()
        .duration(my.duration)
        .attr('transform', function(d) {
          return 'translate(-20, '+my.y_scale(d)+')';})
        .select('text').text(function(d) {return d.toFixed(2); });

    };

    my.draw_group_labels = function() {
      var label_elt;
      label_elt = d3.select('#highlight_labels');
      label_elt.selectAll('div').remove();
      my.groups.forEach(function(g, i) {
        var label = g[0],
          c = my.colormap(i)(1);

        if (label.length === 0) { label = ' '; }
        if (g[1] <= 0) {
          return;
        }
        label_elt.append('div')
          .style('border-color', c)
          .style('background-color',
              c.replace('rgb', 'rgba').replace(')', ', 0.2)'))
          .text(label);
      });
    };

    my.do_point = function(p) {
      var pointed_data, x_super, y_super;

      my.do_unpoint(); // Can only point one at a time!
      my.pointed = p;
      p.style('fill', 'orange').style('stroke', 'orange')
        .each(function(d) {
          pointed_data = d; });

      // And add a super xtick
      x_super = my.xtick_canvas.selectAll('g.supertick')
        .data([pointed_data], function(d) {return d.row_id; });
      x_super.enter().append('svg:g')
        .attr('class', 'supertick')
        .attr('shape-rendering', 'crispEdges')
        .attr('transform', function(d) {
          return 'translate('+my.x_scale(d.x)+', 0)'; });

      x_super.append('svg:line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', -10)
        .attr('stroke', 'black');

      x_super.append('svg:g')
        .attr('transform', 'translate(0, -14)')
        .append('svg:text');

      x_super.select('text').text(function(d) { return d.x.toFixed(2);});

      // And y.
      y_super = my.ytick_canvas.selectAll('g.supertick')
        .data([pointed_data], function(d) {return d.row_id; });

      y_super.enter().append('svg:g')
        .attr('class', 'supertick')
        .attr('shape-rendering', 'crispEdges')
        .attr('transform', function(d) {
          return 'translate(0,'+my.y_scale(d.y)+')'; });

      y_super.append('svg:line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 10)
        .attr('y2', 0)
        .attr('stroke', 'black');

      y_super.append('svg:g')
        .attr('transform', 'translate(15, 0)')
        .append('svg:text');

      y_super.select('text')
        .text(function(d) { return d.y.toFixed(2);})
        .style('text-anchor', 'start')
        .style('dominant-baseline', 'middle');

      y_super.exit()
        .remove();
    };

    my.do_unpoint = function() {
      my.pointed
        .style('fill', function(d) { return my.colormap(d.group)(d.weight);})
        .style('stroke', function(d) { return my.colormap(d.group)(d.weight);});

      my.pointed = d3.select(null);

      my.xtick_canvas.selectAll('g.supertick').remove();
      my.ytick_canvas.selectAll('g.supertick').remove();
    };

    my.draw_point_targets = function() {
      var point_xy, paths, event, targets;
      point_xy = my.point_data.map(function(p) {
        // Add some jitter to the points to keep the voronoi algorithm
        // from failing in the case of collinearity
        return [
          (my.x_scale(p.x)+Math.random()-0.5),
          (my.y_scale(p.y)+Math.random()-0.5)];
      });
      paths = d3.geom.voronoi(point_xy);
      my.point_target_canvas.selectAll('*').remove();
      my.point_target_canvas.selectAll('clipPath')
          .data(point_xy)
        .enter().append('svg:clipPath')
          .attr('id', function(d, i) { return 'target-clip-'+i; })
        .append('svg:circle')
          .attr('r', 32)
          .attr('cx', function(d) { return d[0]; })
          .attr('cy', function(d) { return d[1]; })
          .style('stroke-opacity', 0)
          .style('fill-opacity', 0);

      targets = my.point_target_canvas.selectAll('path')
          .data(paths)
        .enter().append('svg:path')
          .attr('d', function(d) { return 'M'+d.join("L")+"Z";})
          .attr('clip-path', function(d, i) {
            return 'url(#target-clip-'+i+')'; })
          .style('stroke-opacity', 0)
          .style('fill-opacity', 0)
          .on('mouseover', function(d, i) {
            var pdata = my.point_data[i];
            my.do_point(
              my.datapoint_canvas.select('#datapoint-'+pdata.row_id));
          })
          .on('mouseout', function(d, i) {
            my.do_unpoint();
          })
          .on('click', function(d, i) {
            my.data_click_wrapper();
          });
    };

    my.draw_axis_labels = function(xlabel, ylabel) {
      my.xlabel_text.text(xlabel);
      my.ylabel_text.text(ylabel);
    };

    pub.set_click_handler = function(fx) {
      my.click_handler = fx;
    };

    pub.my = my;
    return pub;
  };

  S_my.state_manager = function(
      regress_js_url, regress_csv_url, asset_tag, columns, scatterplot,
      x_control, y_control, x_labels_control, y_labels_control, filter_control,
      highlight_control, nuisance_list, model_control, download_link,
      stats_dashboard, key_handler) {
    var pub = {}, my = {};

    my.base_url = regress_js_url;
    my.regress_csv_url = regress_csv_url;
    my.asset_tag = asset_tag;
    my.columns = columns;
    my.scatterplot = scatterplot;
    my.x_control = $(x_control);
    my.y_control = $(y_control);
    my.x_labels_control = $(x_labels_control);
    my.y_labels_control = $(y_labels_control);
    my.filter_control = $(filter_control);
    my.highlight_control = $(highlight_control);
    my.nuisance_list = $(nuisance_list);
    my.model_control = $(model_control);
    my.download_link = $(download_link);
    my.stats_dashboard = stats_dashboard;
    my.censored_points = [];
    my.saved_censors = [];
    my.key = key_handler;

    my.populate_select = function(control, list, initial_index) {
      var i;
      if (!initial_index) { initial_index = 0; }
      for (i = 0; i < list.length; i += 1) {
        control.append('<option value="'+i+'">'+list[i]+'</option>');
      }
      control.val(initial_index);
    };

    my.handle_scatter_click = function(point_sel) {
      point_sel.each(function(d) {
        pub.toggle_point(d.row_id);
      });
    };
    my.scatterplot.set_click_handler(my.handle_scatter_click);

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
      my.censored_points.sort(d3.ascending);

      my.saved_censors = []; // Clicking a point clears this list.
      pub.update_state();
    };

    pub.hashchange = function(evt) {
      // The main method that'll get called.
      var x_labels, y_labels;
      pub.update_controls();
      x_labels = my.x_labels_control.val().split(",").map(function(v) { return +v; });
      y_labels = my.y_labels_control.val().split(",").map(function(v) { return +v; });
      my.download_link.attr('href', pub.csv_url());
      $.ajax({
        'url': pub.json_url(),
        'success': function(data) {
            my.scatterplot.update(
              data.points,
              data.regression_line,
              data.x_label,
              data.y_label,
              data.group_list,
              data.model_type,
              x_labels,
              y_labels);
            my.stats_dashboard.update(data.stats_diagnostics);
          },
        'error': function() { console.log("Error?"); }
      });
    };

    pub.update_state = function() {
      var opts, xy_ints, nuisance_ids, highlight_idx, filter_idx, nuisance_list,
        censor_list;
      opts = {
        'x' : my.x_control.val(),
        'y' : my.y_control.val(),
        'm' : my.model_control.val()};
      xy_ints = intify([my.x_control.val(), my.y_control.val()]);
      nuisance_ids = $.grep(my.checked_nuisance_vals(), function(v) {
          return (xy_ints.indexOf(v) <= 0); });

      highlight_idx = my.highlight_control.val();
      if (highlight_idx !== "") {
        opts.h = highlight_idx;
      }

    filter_idx = my.filter_control.val();
    if (filter_idx !== "") {
      opts.f = filter_idx;
    }

    my.x_labels = my.x_labels_control.val().trim();
    my.y_labels = my.y_labels_control.val().trim();

    if (my.x_labels !== "") {
      opts.xl = my.x_labels;
    }
    if (my.y_labels !== "") {
      opts.yl = my.y_labels;
    }

      nuisance_list = nuisance_ids.join(",");
      if (nuisance_list !== '') { opts.n = nuisance_list; }
      censor_list = my.censored_points.join(",");
      if (censor_list !== '') { opts.c = censor_list; }
      $.bbq.pushState(opts, 2);
    };

    pub.x_var_name = function() {
      var xidx = parseInt(my.x_control.val(), 10);
      return columns[xidx];
    };

    pub.y_var_name = function() {
      var yidx = parseInt(my.y_control.val(), 10);
      return columns[yidx];
    };

    pub.nuisance_var_names = function() {
      var names = [],
        nuisances = my.checked_nuisance_vals(),
        i;
      for (i = 0; i < nuisances.length; i += 1) {
        names.push(columns[nuisances[i]]);
      }
      return names;
    };

    my.generate_nuisance_list = function() {
      var st, nuis_idxs, xy_idxs, col_list_decorated;
      st = $.bbq.getState();
      nuis_idxs = csv_split(st.n);
      xy_idxs = intify([st.x, st.y]);
      col_list_decorated = my.decorate_column_list_selectable(
        my.columns, xy_idxs, nuis_idxs);
      return col_list_decorated;
    };

    my.populate_nuisance_lists = function() {
      var list, item, li, i;
      list = my.generate_nuisance_list();
      my.nuisance_list.empty();
      for (i = 0; i < list.length; i += 1) {
        item = list[i];
        li = $(document.createElement("li"));
        if (!item.allowed) { li.addClass("disallowed"); }
        my.nuisance_list.append(li.append(my.make_nuisance_selector(item)));
      }
      my.nuisance_list.find("input").change(function() {
        pub.update_state();
      });
    };

    my.checked_nuisance_vals = function() {
      var l, checked;
      l = [];
      checked = my.nuisance_list.find("input:checked");
      $.each(checked, function(i, elt) { l.push(elt.value); });
      return intify(l).sort();
    };

    my.decorate_column_list_selectable = function(
        columns, disallowed_idxs, selected_idxs) {
      var disalloweds, selecteds, out, i, allowed, selected, name;
      disalloweds = intify(disallowed_idxs);
      selecteds = intify(selected_idxs);

      out = [];
      for (i = 0; i < columns.length; i += 1) {
        name = columns[i];
        allowed = (disalloweds.indexOf(i) <= -1);
        selected = allowed && (selecteds.indexOf(i) > -1);
        out.push({name:name, i: i, allowed: allowed, selected: selected});
      }
      return out;
    };

    my.make_nuisance_selector = function(n) {
      // Makes something like
      // <input type="checkbox" id="n_X" name="n_X" value="X" />
      // <label for="n_X">Column name</label>
      var dis_str, checked_str, n_str, out_str;
      dis_str = ' disabled="disabled" ';
      if (n.allowed) { dis_str = ' '; }
      checked_str = ' ';
      if (n.selected) { checked_str = ' checked = "checked" '; }
      n_str = '"n_'+n.i+'"';
      out_str = '<div class="l"><input type="checkbox"'+checked_str+dis_str+'id = '+n_str+' value="'+n.i+'" /></div>';
      out_str += '<label for='+n_str+'>'+add_breaks(n.name)+'</label>';
      return out_str;
    };

    my.populate_select(my.x_control, my.columns, 0);
    my.populate_select(my.y_control, my.columns, 0);

    pub.update_controls = function() {
      // Update the controls on the page and our internal tracking of
      // censored points from the URL hash
      var cur_state, cstr, clist;
      cur_state = $.bbq.getState();
      my.x_control.val(cur_state.x);
      my.y_control.val(cur_state.y);
      my.x_labels_control.val(cur_state.xl || "");
      my.y_labels_control.val(cur_state.yl || "");
      my.filter_control.val(cur_state.f || "");
      my.highlight_control.val(cur_state.h || "");
      my.model_control.val(cur_state.m);
      my.populate_nuisance_lists();
      cstr = cur_state.c || "";
      clist = [];
      if (cstr !== "") {
        clist = intify(cstr.split(","));
      }
      my.censored_points = clist;
    };

    pub.json_url = function() {
      var s = $.bbq.getState();
      s.at = my.asset_tag;
      return $.param.querystring(my.base_url, s, 2);
    };

    pub.csv_url = function() {
      return $.param.querystring(my.regress_csv_url, $.bbq.getState(), 2);
    };

    my.x_control.change(function() { pub.update_state(); });
    my.y_control.change(function() { pub.update_state(); });
    my.x_labels_control.change(function(e) { pub.update_state(); });
    my.y_labels_control.change(function(e) { pub.update_state(); });
    my.filter_control.change(function() { pub.update_state(); });
    my.highlight_control.change(function() { pub.update_state(); });
    my.model_control.change(function() { pub.update_state(); });

    my.advance_select = function(control, go_forward) {
      var cur_idx, max_idx, next_idx, c;

      c = control[0];
      cur_idx = c.selectedIndex;
      max_idx = control.children('option').length - 1;
      next_idx = cur_idx;

      if (go_forward) {
        next_idx += 1;
      } else {
        next_idx -= 1;
      }
      if (next_idx < 0) { next_idx = 0;}
      if (next_idx > max_idx) { next_idx = max_idx; }
      if (next_idx !== cur_idx) {
        c.selectedIndex = next_idx;
        pub.update_state();
      }
    };

    my.toggle_all_censors = function() {
      console.log("Toggle all censors!");
      if (my.saved_censors.length === 0) {
        my.saved_censors = my.censored_points;
        my.censored_points = [];
      } else {
        my.censored_points = my.saved_censors;
        my.saved_censors = [];
      }
      pub.update_state();
    };

    my.set_keyboard_shortcuts = function() {
      my.key('j', function() { my.advance_select(my.y_control, false); });
      my.key('k', function() { my.advance_select(my.y_control, true); });
      my.key('u', function() { my.advance_select(my.x_control, false); });
      my.key('i', function() { my.advance_select(my.x_control, true); });
      my.key('o', function() { my.advance_select(my.model_control, false); });
      my.key('p', function() { my.advance_select(my.model_control, true); });
      my.key('c', function() { my.toggle_all_censors(); });
    };
    my.set_keyboard_shortcuts();

    pub.my = my;
    return pub;
  };

  function stats_dashboard(container) {
    var my = {}, pub = {};

    my.stats_container = d3.select(container);

    pub.update = function(stats_data) {
      var table, tr, stats_item, opts;
      my.stats_container.selectAll('div').remove();
      stats_data.forEach(function(s) {
        stats_item = my.stats_container.append('div');
        stats_item.append('h3').text(s.title);
        table = stats_item.append('table');
        s.data.forEach(function(stat) {
          opts = stat[2] || {};
          if (!opts.hide) {
            tr = table.append('tr');
            tr.append('th').html(S_my.format_stats_name(stat[0])+':');
            tr.append('td').html(nice_num(stat[1]));
          }
        });
      });
      my.stats_container.append('div')
        .attr('class', 'warning')
        .text('Stats code not (yet) thoroughly validated. Double-check values '+
          'before publishing!');
    };

    pub.my = my;
    return pub;
  }
  S_my.stats_dashboard = stats_dashboard;

  S_my.STATS_DISPLAY = {
    'Rsq': 'R&sup2;',
    'RsqAdj': 'Adjusted R&sup2;',
    'b': '&beta;',
    'rho': "&rho;"
  };

  S_my.format_stats_name = function(key) {
    return (S_my.STATS_DISPLAY[key] || key);
  };

  S_my.help_control = function(container_selector, header_link, key_handler) {
    var my = {};
    my.container = $(container_selector);
    my.header_link = $(header_link);
    my.key = key_handler;

    function hide_help_container(){
      my.container.css('display', '');
    }

    function show_help_container() {
      my.container.css('display', 'block');
    }

    function toggle_help_container() {
      if (my.container.css('display') === 'block') {
        my.container.css('display', '');
      } else {
        my.container.css('display', 'block');
      }
    }

    function setup_container() {
      my.container.find('a.close').bind('click', function(ev) {
        hide_help_container();
        ev.preventDefault();
      });
      my.header_link.bind('click', function(ev) {
        toggle_help_container();
        ev.preventDefault();
      });
      my.key('shift+/, ?', function() { show_help_container(); });
      my.key('esc', function() { hide_help_container(); });
    }

    setup_container();
  };

  return S_my;
}(jQuery, d3);
