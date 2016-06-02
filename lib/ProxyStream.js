var util = require('util');
var stream = require('stream');

var ProxyStream = function () {
	stream.PassThrough.call(this);
	this._headers = {};
	this._destroyed = false;
};

util.inherits(ProxyStream, stream.PassThrough);

ProxyStream.prototype.setHeader = function (name, value) {
	this._headers[name] = value;
};

ProxyStream.prototype.destroy = function (err) {
	if (this._destroyed){
		return;
	}
	this._destroyed = true;
	var self = this;
	process.nextTick(function () {
		if (err) {
			self.emit('error', err);
		}
		self.emit('close');
	});
};

module.exports = ProxyStream;