JSON-RPC 2.0 client
===================

Primitive [JSON-RPC 2.0](http://www.jsonrpc.org/specification) client library for browser Javascript.

Example
-------

Example usage with HTTP as transport (see [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)):

``` Javascript
var address = "http://127.0.0.1:8000/";

var send = function (request, callback) {
	var requester = new XMLHttpRequest(); 

	var load = function (event) {
		if (this.readyState == 4) {
			if (this.status == 200 && this.getResponseHeader("content-type") == "application/json") {
				callback(this.response);
			} else {
				callback(new Error("Query error"));
			}
		}
	};

	requester.addEventListener("readystatechange", load);
	requester.open("POST", address);
	requester.setRequestHeader("Content-Type", "application/json");
	requester.send(request);
};

var RPC = new JSONRPC20Client(send);

var callback = function (result) {
	console.log(result);
};

var caught = function (error) {
	console.error(error);
};

RPC.callOne(new RPC.Call("add", [1, 2], callback), caught);

RPC.callMany([
	new RPC.Call("add", [1, 2], callback),
	new RPC.Call("sub", [3, 1]),
	new RPC.Call("div", [1, 0], callback)
], caught);
```

`JSONRPC20Client(send)`
-----------------------

`function send(request, callback)` is used for communication with remote server. Arguments:

* JSON encoded request.
* Callback of type `function (response)`. `response` must be string or `Error` object in case of connection error.

### `JSONRPC20Client.callOne(call, callback)`

Performs a remote procedure call. Arguments are `Call` object and optional callback for connection and protocol level error handling.

### `JSONRPC20Client.callMany(calls, callback)`

Performs several remote procedure calls. Requires an array of `Call` objects. Additional callback may be specified for connection and protocol level error handling.

### `JSONRPC20Client.Call(method, params, callback)`

`Call` object. Cunstructor arguments:

* Method name.
* Object or array of arguments for method call. May be omitted.
* Callback of type `function (result)`. The result can be `Object`, `Array`, `String`, `Number`, `Boolean`, `null` or `Error` (with `code` and `data` fields set). Callback may be omitted, if notification request is needed.
