	var timeout = 500; //ms
	var vertical_scale = 100; //percents
	var width_timing = 50;  // right legend size px
	var height_timing = 20;  // bottom legend size px
	var threshold_orange = 40; //percent
	var threshold_red = 10; //percent
	var correction = 0.5; // https://javascript.ru/forum/misc/34133-canvas-tolshhina-linii.html
	var store_pings = 500; //count of pings stored in localstorage


function GetLevel(source, callback) {
	$.ajax({
		type: "GET",
		dataType: "json",
		url: source + "?" + (+new Date()),
		success: function(data) {
			var res = JSON.parse(data.responseText);
			console.log('data.responseText: ' + data.responseText);
			if (typeof callback === "function") {
				return callback(null, res.level);
			}
		},
		error: function(e) {
			console.log('error: ' + JSON.stringify(e));
			if (typeof callback === "function") {
				return callback('error', null);
			}
		},
		timeout: timeout
	});
}

	function drawLine(ctx, level, position, height_graphic) {
	  var is_charging = 1;
	  if (level < 0) {
		level = -level;
		is_charging = 0;
	  }
	  if (is_charging == 0) {
		if (level <= threshold_red) {
			ctx.strokeStyle = 'red';
		} else if (level <= threshold_orange) {
			ctx.strokeStyle = 'orange';
		} else {
			ctx.strokeStyle = 'blue';
		}
	  } else {
		ctx.strokeStyle = 'limegreen';
	  }

		ctx.beginPath();
		ctx.lineWidth = 1;
		ctx.setLineDash([0]);
		ctx.moveTo(position +correction, height_graphic -2 +correction);
		if (level > 100) {level = 100};
		let h = level/vertical_scale * (height_graphic -2);
		if (h > height_graphic -2) {h = height_graphic -2};
		ctx.lineTo(position +correction, height_graphic -2 - h+1 +correction);
		ctx.stroke();
	}

	function drawPing(ctx, level, width, height) {
		var width_graphic = width -width_timing;
		var height_graphic = height -height_timing;
		var imageData = ctx.getImageData(2, 1, width_graphic +1, height_graphic -2);
		ctx.putImageData(imageData, 1, 1);
		if (level) {
			drawLine(ctx, level, width_graphic, height_graphic);
			drawDL(ctx);
		}
	}

	function savePing(name, level) {
		var p_data = localStorage.getItem('bat_ping_' + name);
		if (p_data) {
			var p = JSON.parse(p_data);
		} else {
			p = [];
		}
		p.unshift(level);
		if (p.length > store_pings) {
			p = p.slice(0, store_pings);
		}

		//console.log('ping_' + name + ':=' + JSON.stringify(p));
		localStorage.setItem('bat_ping_' + name, JSON.stringify(p));
	}

	function fillMissedData(name, ping_interval) {
		var t1 = localStorage.getItem('bat_time_' + name);
		if (t1 > 0) {
			var t2 = new Date().getTime();
			var missed_sec = (t2-t1)/1000;

			var sec_per_ping = ping_interval/1000;
			var missed_pings = missed_sec/sec_per_ping;
			console.log('missed_sec.. ' + name + ' : ' + t1 + "-" + t2 + " > " + missed_sec + ' >> ' + missed_pings);
			if (missed_pings > store_pings) { missed_pings = store_pings }
			for (var i=1; i<=missed_pings; i++) {
				savePing(name, 0);
			}
		}
	}

	function loadAndDrawPing(name, ctx, width, height) {
		var p_data = localStorage.getItem('bat_ping_' + name);
		console.log('LOADING... ' + name + ':' + p_data);

		if (p_data) {
			var p = JSON.parse(p_data);
		} else {
			p = [];
		};

		var oldest_i = Math.min(p.length-1, width-width_timing);
		console.log(name + ' oldest_i -> ' + oldest_i);
		for (var i = oldest_i; i >= 0; i--) {
			if (p[i]) {
				drawLine(ctx, p[i], width -width_timing -i, height -height_timing);
			}
		};
		if (p.length > 0) {
			$('#span_' + name).html(p[0] + '%');
		}
	}

	function pingAndDraw(name, src, ctx, width, height, rel_name, rel_rate) {
		var width_graphic = width -width_timing;
		var height_graphic = height -height_timing;

		if (rel_name) {
			var p_data = localStorage.getItem('bat_ping_' + rel_name);
			if (p_data) {
				var p = JSON.parse(p_data);
			} else {
				p = [];
			};

			var level_agg = 0;
			var is_charging_agg = 0;
			var count_i = Math.min(p.length-1, rel_rate);
			for (var i = 0; i < count_i; i++) {
				level_agg += Math.abs(p[i]);
				is_charging_agg += Math.sign(p[i]);
			}
			var level = Math.round(level_agg / count_i,1);
			var is_charging = Math.round(is_charging_agg / count_i,1);
			if (is_charging <= 0) {level = -level};

			//console.log(name + ' -> ' + level);
			$('#span_' + name).html(level + '%');
			savePing(name, level);
			drawPing(ctx, level, width, height);
			var n = new Date().getTime();
			localStorage.setItem('bat_time_' + name, n);

		} else {
			GetLevel(src, function(err, level) {
				//console.log(name + ' -> ' + level);
				$('#span_' + name).html(level + '%');
				savePing(name, level);
				drawPing(ctx, level, width, height);
				var n = new Date().getTime();
				localStorage.setItem('bat_time_' + name, n);
			});

			/*var p = new Ping();
			p.ping(src, function(err, ms) {
				//console.log(name + ' -> ' + ms);
				$('#span_' + name).html(ms + 'ms');
				savePing(name, ms);
				drawPing(ctx, ms, width, height);
				var n = new Date().getTime();
				localStorage.setItem('time_' + name, n);
			});*/
		}
		drawDL(ctx, width, height);
	}

	function drawDL(ctx, width, height) {
		var width_graphic = width -width_timing;
		var height_graphic = height -height_timing;

		ctx.lineWidth = 1;
		ctx.strokeStyle = 'white';
		ctx.beginPath();
		ctx.setLineDash([0]);
		ctx.moveTo(1 +correction, Math.round(height_graphic/2) +correction);
		ctx.lineTo(width_graphic +correction, Math.round(height_graphic/2) +correction);
		ctx.stroke();

		ctx.strokeStyle = 'orange';
		ctx.beginPath();
		ctx.setLineDash([2]);
		ctx.moveTo(1 +correction, Math.round(height_graphic/2) +correction);
		ctx.lineTo(width_graphic +correction, Math.round(height_graphic/2) +correction);
		ctx.stroke();
	};

	function drawIni(ctx, ping_interval, width, height) {
		var width_graphic = width -width_timing;
		var height_graphic = height -height_timing;

		ctx.strokeStyle = 'gray';
		ctx.beginPath();
		ctx.setLineDash([0]);
		ctx.moveTo(0 +correction, 0 +correction);
		ctx.lineTo(width-1 +correction, 0 +correction);
		ctx.lineTo(width-1 +correction, height_graphic -1 +correction);
		ctx.lineTo(0 +correction, height_graphic -1 +correction);
		ctx.lineTo(0 +correction, 0 +correction);
		ctx.stroke();

		ctx.font = "10px sans-serif";
		ctx.fillText(vertical_scale + ' %', width_graphic +5 +correction, 10 +correction);
		ctx.fillText(Math.round(vertical_scale/2) + ' %', width_graphic +5 +correction, Math.round(height_graphic/2) +correction);
		ctx.fillText('0 %', width_graphic +5 +correction, height_graphic -5 +correction);

		var sec_per_pixel = ping_interval/1000;
		var sec_total = width_graphic * sec_per_pixel;
		var px_per_minute = 60/sec_per_pixel;
		var px_per_hour = 60*px_per_minute;
		if (px_per_minute > 1) {
			for (var minute_i = 0; minute_i > -sec_total/60; minute_i--) {
				if (minute_i%20 === 0 
					|| (minute_i%2 === 0 && px_per_minute >= 5)
					|| px_per_minute >= 30) {
					ctx.fillText(minute_i + 'm', width_graphic +(minute_i*px_per_minute) +correction, height_graphic +10 +correction);
				}
			}
		} else if (px_per_hour > 10) {
			for (var minute_i = 0; minute_i > -sec_total/60; minute_i--) {
				if (minute_i%120 === 0) {
					ctx.fillText(Math.round(minute_i/60) + 'h', width_graphic +(minute_i*px_per_minute) +correction, height_graphic +10 +correction);
				}
			}
		} else {
			for (var minute_i = 0; minute_i > -sec_total/60; minute_i--) {
				if (minute_i%1440 === 0) {
					ctx.fillText(Math.round(minute_i/60/24) + 'd', width_graphic +(minute_i*px_per_minute) +correction, height_graphic +10 +correction);
				}
			}
		}

		drawDL(ctx, width, height);
	};

	function renderPingGraphic(name, imgsrc, ping_interval, width, height, rel_name) {
		localStorage.setItem('bat_interval_' + name, ping_interval);
		document.write(name + ' last ping: <span id="span_' + name + '"></span><br/>');
		document.write('<canvas id="canvas_' + name + '" width="' + width + '" height="' + height + '"></canvas>');
		var c = document.getElementById('canvas_' + name);
		var ctx = c.getContext('2d');
		drawIni(ctx, ping_interval, width, height);
		fillMissedData(name,ping_interval);
		loadAndDrawPing(name, ctx, width, height)
		var rel_interval = localStorage.getItem('bat_interval_' + rel_name);
		var rel_rate = ping_interval/rel_interval;
		setInterval(() => pingAndDraw(name, imgsrc, ctx, width, height, rel_name, rel_rate), ping_interval);
	};
