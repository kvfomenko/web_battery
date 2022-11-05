"use strict";
const bat = require("windows-battery");
const http = require('http');
const os = require("os");
const url = require('url');

const LOCAL_NETWORK_MASK = '192.168.0.';
const MAIN_PORT_START = 3003;
const PROXY_PORTS_COUNT = 5;


var hostname = (process.argv[2]) ? process.argv[2] : os.hostname();
//var port = (process.argv[3]) ? process.argv[3] : MAIN_PORT_START;
var interfaces = os.networkInterfaces();
var localaddress = '';
for (const iface in interfaces) {
	var addresses = interfaces[iface];
	for (var i=0; i<addresses.length; i++) {
		if (addresses[i].address.includes(LOCAL_NETWORK_MASK) ) {
			localaddress = addresses[i].address;
		}
	}
}

http.createServer(function (req, res) {
	main_gateway(req, res);
}).listen(MAIN_PORT_START);
console.log('Battery main-service listening for ' + hostname + ' on http://' + localaddress + ':' + MAIN_PORT_START);

for (var port_i=1; port_i<=PROXY_PORTS_COUNT; port_i++) {
	http.createServer(function (req, res) {
		proxy_gateway(req, res);
	}).listen(MAIN_PORT_START+port_i);
	console.log('Battery proxy-service listening for ' + hostname + ' on http://' + localaddress + ':' + (MAIN_PORT_START+port_i));
}


function main_gateway(request, response) {
	var state = bat.battery();
	if (state.ischarging) {var batlevel = state.estcharge} else (batlevel = -state.estcharge);
	var apiData = {level: batlevel, hostname: hostname};
	console.log('main request:' + JSON.stringify(apiData));
	
	generateOutput(apiData, response);
}


function proxy_gateway(request, response) {
	var url_parsed = url.parse(request.url, true);

	var callback = function(response2) {
		var resp_data = '';
		response2.on('data', function (chunk) {
			resp_data += chunk;
		});
		response2.on('end', function () {
			var resp_json = JSON.parse(resp_data);
			var apiData = {level: resp_json.level, hostname: resp_json.hostname};
			generateOutput(apiData, response);
		});
	}

	console.log('proxy request to: ' + url_parsed.query.proxytohost + ':' + MAIN_PORT_START);
	var req = http.request({host: url_parsed.query.proxytohost, 
			port: MAIN_PORT_START, 
			method: 'GET',
			timeout: 1000, 
			path: '/?fromproxy='+hostname}, callback).end();

	req.on('timeout', () => {
		console.log('proxy request timeout');
	});
	req.on('error', () => {
		console.log('proxy request error');
		req.destroy();
		var apiData = {error: 'timeout', level: 0, hostname: hostname};
		generateOutput(apiData, response);
	});

}

function generateOutput(apiData, response) {
	response.setHeader('Content-Type', 'application/json');
	response.setHeader('Access-Control-Allow-Headers', 'User-Agent, Accept-Language, Content-Type, Content-Length, Connection, Date, Set-Cookie');
	response.setHeader('Access-Control-Allow-Methods', 'GET');
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.end(JSON.stringify(apiData));
};


