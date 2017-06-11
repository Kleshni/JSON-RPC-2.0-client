"use strict";

var JSONRPC20Client = function () {
	var createIDString = function () {
		return "{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}".replace(/[xy]/g, function (match) {
			var nibble = Math.floor(Math.random() * 16);
			return (match === "x" ? nibble : (nibble & 0x3 | 0x8)).toString(16);
		});
	};

	var Call = function (method) {
		this.method = method;

		if (arguments.length >= 3) {
			this.params = arguments[1];
			this.callback = arguments[2];
		} else if (arguments.length === 2) {
			if (typeof arguments[1] === "function") {
				this.callback = arguments[1];
			} else {
				this.params = arguments[1];
			}
		}

		this.object = {
			"jsonrpc": "2.0",
			"method": this.method
		};

		if ("params" in this) {
			this.object.params = this.params;
		}

		if ("callback" in this) {
			this.object.id = createIDString();
		}
	};

	var JSONRPC20Client = function (send) {
		this.Call = Call; // Compatibility

		var parseResponse = function (data, expected) {
			if (data instanceof Error) {
				throw data;
			} else {
				if (Object.keys(expected).length !== 0) {
					return JSON.parse(data);
				} else if (data.length !== 0) {
					throw new Error("Invalid server response");
				} else {
					return null;
				}
			}
		};

		var checkErrorFormat = function (error) {
			var keysCount = Object.keys(error).length;

			return (
				typeof error.code === "number" && error.code % 1 === 0 &&
				typeof error.message === "string" &&
				(keysCount === 2 || keysCount === 3 && "data" in error)
			);
		};

		var checkResponseFormat = function (response, expected) {
			return (
				"jsonrpc" in response && response.jsonrpc === "2.0" &&
				"id" in response && response.id in expected &&
				("result" in response || "error" in response && checkErrorFormat(response.error)) &&
				Object.keys(response).length === 3
			);
		};

		var processResponse = function (response, expected) {
			var result;

			if (checkResponseFormat(response, expected)) {
				if ("error" in response) {
					var error = new Error(response.error.message);

					error.code = response.error.code;

					if ("data" in response.error) {
						error.data = response.error.data;
					}

					result = error;
				} else {
					result = response.result;
				}
			} else {
				throw Error("Invalid server response");
			}

			var call = expected[response.id];

			delete expected[response.id];

			call.result = result;

			return call;
		};

		var noop = function () {};

		this.callOne = function (call, caught) {
			var expected = Object.create(null);

			if ("callback" in call) {
				expected[call.object.id] = call;
			}

			caught = arguments.length >= 2 ? caught : noop;

			var receive = function (data) {
				var response;

				try {
					response = parseResponse(data, expected);
				} catch (exception) {
					caught(exception);

					return;
				}

				if (response === null) {
					return;
				}

				var processed;

				try {
					processed = processResponse(response, expected);
				} catch (exception) {
					caught(exception);

					return;
				}

				processed.callback(processed.result);
			};

			send(JSON.stringify(call.object), receive);
		};

		this.callMany = function (calls, caught) {
			var request = [];
			var expected = Object.create(null);

			for (var i = 0; i < calls.length; ++i) {
				request.push(calls[i].object);

				if ("callback" in calls[i]) {
					expected[calls[i].object.id] = calls[i];
				}
			}

			caught = arguments.length >= 2 ? caught : noop;

			var receive = function (data) {
				var response;

				try {
					response = parseResponse(data, expected);
				} catch (exception) {
					caught(exception);

					return;
				}

				if (response === null) {
					return;
				}

				if (!(response instanceof Array)) {
					caught(new Error("Invalid server response"));

					return;
				}

				var processed = [];

				for (var i = 0; i < response.length; ++i) {
					try {
						processed.push(processResponse(response[i], expected));
					} catch (exception) {
						caught(exception);

						return;
					}
				}

				if (Object.keys(expected).length !== 0) {
					caught(new Error("Invalid server response"));

					return;
				}

				for (var i = 0; i < processed.length; ++i) {
					processed[i].callback(processed[i].result);
				}
			};

			send(JSON.stringify(request), receive);
		};
	};

	JSONRPC20Client.Call = Call;

	return JSONRPC20Client;
}();
