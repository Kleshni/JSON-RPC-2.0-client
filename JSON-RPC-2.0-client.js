var JSONRPC20Client = function (send) {
	var createID = function () {
		return "{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}".replace(/[xy]/g, function (match) {
			var nibble = ~~(Math.random() * 16);
			return (match == "x" ? nibble : (nibble & 0x3 | 0x8)).toString(16);
		});
	};

	this.Call = function(method, params, callback) {
		this.method = method;
		this.params = params;
		this.callback = callback;
	};

	var parseResponse = function (response) {
		if (response instanceof Error) {
			throw response;
		} else {
			return JSON.parse(response);
		}
	};

	var checkResultFormat = function (result) {
		return (
			result.jsonrpc === "2.0" &&
			Object.keys(result).length == 3 && (
				"result" in result ||
				"error" in result && (
					typeof (result.error.code) == "number" &&
					result.error.code % 1 == 0 &&
					typeof (result.error.message) == "string" && (
						Object.keys(result.error).length == 2 ||
						Object.keys(result.error).length == 3 &&
						"data" in result
					)
				)
			)
		);
	};

	var processResult = function (expected, result) {
		if (checkResultFormat(result) && result.id in expected) {
			if ("error" in result) {
				var error = new Error(result.error.message);

				error.code = result.error.code;
				error.data = result.error.data;

				return error;
			} else {
				return result.result;
			}
		} else {
			throw new Error("Invalid server response");
		}
	};

	this.callOne = function (call, caught) {
		var expected = {};
		var request = {
			"jsonrpc": "2.0",
			"method": call.method,
			"params": call.params
		};

		if (call.callback !== undefined) {
			request.id = createID();
			expected[request.id] = call;
		}

		caught = caught !== undefined ? caught : new Function();

		var receive = function (response) {
			if (Object.keys(expected).length == 0) {
				if (response !== "") {
					caught(new Error("Invalid server response"));
				}
			} else {
				try {
					response = parseResponse(response);
				} catch (exception) {
					caught(exception);
					return;
				}

				expected[null] = undefined;

				try {
					var result = processResult(expected, response);
				} catch (exception) {
					caught(exception);
					return;
				}

				if (response.id == null) {
					if (result instanceof Error) {
						caught(result);
					} else {
						caught(new Error("Invalid server response"));
					}
				} else {
					call.result = result;
					call.callback(result);
				}
			}
		};

		send(JSON.stringify(request), receive);
	};

	this.callMany = function (calls, caught) {
		var expected = {};
		var request = [];

		for (var i = 0; i < calls.length; ++i) {
			var temp = {
				"jsonrpc": "2.0",
				"method": calls[i].method,
				"params": calls[i].params
			};

			if (calls[i].callback !== undefined) {
				temp.id = createID();
				expected[temp.id] = calls[i];
			}

			request.push(temp);
		}

		caught = caught !== undefined ? caught : new Function();

		var receive = function (response) {
			if (Object.keys(expected).length == 0) {
				if (response !== "") {
					caught(new Error("Invalid server response"));
				}
			} else {
				try {
					response = parseResponse(response);
				} catch (exception) {
					caught(exception);
					return;
				}

				if (response instanceof Array) {
					for (var i = 0; i < response.length; ++i) {
						try {
							var result = processResult(expected, response[i]);
						} catch (exception) {
							caught(exception);
							return;
						}

						expected[response[i].id].result = result;
					}

					for (var i in expected) {
						expected[i].callback(expected[i].result);
					}
				} else {
					try {
						var result = processResult({null: undefined}, response);
					} catch (exception) {
						caught(exception);
						return;
					}

					if (result instanceof Error) {
						caught(result);
					} else {
						caught(new Error("Invalid server response"));
					}
				}
			}
		};

		send(JSON.stringify(request), receive);
	};
};
