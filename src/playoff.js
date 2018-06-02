/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('request-promise');
const Promise = require('bluebird');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

class PlayoffException extends Error {

  constructor(name, message, status, headers, errors) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('return') + 6 + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    this.name = name;
    this.message = message;
    if (status == null) { status = 500; }
    this.status = status;
    this.headers = headers;
    if (errors != null) {
      this.errors = errors;
    }
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    const error = {
      error: this.name,
      error_description: this.message
    };
    if (this.errors != null) {
      error.data = this.errors;
    }
    return error;
  }
}

class Playoff {

  static createJWT(options) {
    let {client_id, client_secret, player_id, scopes, expires} = options;
    if (scopes == null) { scopes = []; }
    if (expires == null) { expires = 3600; }
    const payload = { player_id, scopes };
    let token = jwt.sign(payload, client_secret, { algorithm: 'HS256', expiresInSeconds: expires });
    token = `${client_id}:${token}`;
    return token;
  }

  constructor(options) {
    this.options = options;
    if (_.isUndefined(this.options.hostname)){ this.options.hostname='playoff.cc'}
    if (_.isUndefined(this.options)) { throw new Error('You must pass in options'); }
    if (_.isUndefined(this.options.type)) { throw new Error('You must pass in type which can be code or client'); }
    if (!_.contains(['code', 'client'], this.options.type)) { throw new Error('You must pass in type which can be code or client'); }
    if ((this.options.type === 'code') && _.isUndefined(this.options.redirect_uri)) { throw new Error('You must pass in a redirect_uri for authoriztion code flow'); }
    if (_.isUndefined(this.options.version)) { throw new Error( 'You must pass in version of the API you would like to use which can be v1 or v2'); }
    if (this.options.auth_endpoint == null) { this.options.auth_endpoint = "https://"+this.options.hostname; }
    if (this.options.api_endpoint == null) { this.options.api_endpoint = "https://api."+this.options.hostname; }
    if (this.options.strictSSL == null) { this.options.strictSSL = true; }
    if (this.options.store == null) { this.options.store = (access_token, done) => {
      this.access_token = access_token;
      return done(null, this.access_token);
    }; }
    if (this.options.load == null) { this.options.load = done => {
      return done(null, this.access_token);
    }; }
    this.endpoint = `${this.options.api_endpoint}/${this.options.version}`;
  }

  _done(err, result) {
    if (err) {
      return Promise.reject(err);
    } else {
      return Promise.resolve(result);
    }
  }

  getAuthorizationURI() {
    return `${this.options.auth_endpoint}/auth?${require("querystring").stringify({response_type: 'code', redirect_uri: this.options.redirect_uri, client_id: this.options.client_id })}`;
  }

  makeRequest(method, url, query, body, full_response) {
    if (full_response == null) { full_response = false; }
    const data = {
      url,
      method: method.toUpperCase(),
      qs: query,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body),
      strictSSL: this.options.strictSSL,
      encoding: null,
      resolveWithFullResponse: true
    };
    return request(data)
    .then(function(response) {
      let res_body;
      if (/application\/json/.test(response.headers['content-type'])) {
        res_body = JSON.parse(response.body.toString());
      } else {
        res_body = response.body;
      }
      if (full_response) {
        return Promise.resolve({
          headers: response.headers,
          status: response.statusCode,
          body: response.body
        });
      } else {
        return Promise.resolve(res_body);
      }}).catch(err => {
      if ((err.response != null) && /application\/json/.test(err.response.headers['content-type'])) {
        const res_body = JSON.parse(err.response.body.toString());
        if (res_body.error === 'invalid_access_token') {
          return this.getAccessToken()
          .then(() => {
            return this.api(method, url.replace(this.endpoint, ''), query, body, full_response);
          });
        } else {
          return Promise.reject(new PlayoffException(res_body.error, res_body.error_description, err.response.statusCode, err.response.headers, res_body.data));
        }
      } else {
        return Promise.reject(err);
      }
    });
  }

  makeTokenRequest(body) {
    return this.makeRequest('POST', `${this.options.auth_endpoint}/auth/token`, {}, body)
    .then(token => {
      token.expires_at = new Date(new Date().getTime() + (parseInt(token.expires_in) * 1000));
      return this.options.store(token, this._done)
      .then(() => Promise.resolve(token));
    });
  }

  exchangeCode(code) {
    return this.getAccessToken(code);
  }

  getAccessToken(code) {
    const body = {
      client_id: this.options.client_id,
      client_secret: this.options.client_secret,
      grant_type: 'client_credentials'
    };
    if (this.options.type === 'code') {
      return this.options.load(this._done)
      .then(token => {
        if (token != null) {
          body.grant_type = 'refresh_token';
          body.refresh_token = token.refresh_token;
        } else {
          body.grant_type = 'authorization_code';
          body.redirect_uri = this.options.redirect_uri;
          body.code = code;
        }
        return this.makeTokenRequest(body);
      });
    } else {
      return this.makeTokenRequest(body);
    }
  }

  checkAccessToken(query) {
    if (this.options.player_id) { query.player_id = this.options.player_id; }
    return this.options.load(this._done)
    .then(token => {
      if (token == null) {
        if (this.options.type === 'code') {
          return Promise.reject({error: "Initialize the Authorization Code Flow by exchanging the code"});
        } else {
          return this.getAccessToken();
        }
      } else if (new Date() > new Date(token.expires_at)) {
        return this.getAccessToken();
      } else {
        return Promise.resolve(token);
      }
  }).then(token => {
      query.access_token = token.access_token;
      return Promise.resolve();
    });
  }

  api(method, url, query, body, full_response) {
    if (query == null) { query = {}; }
    if (body == null) { body = {}; }
    if (full_response == null) { full_response = false; }
    return this.checkAccessToken(query)
    .then(() => {
      return this.makeRequest(method, `${this.endpoint}${url}`, query, body, full_response);
    });
  }

  get(url, query, full_response) { return this.api('GET', url, query, null, full_response); }
  post(url, query, body, full_response) { return this.api('POST', url, query, body, full_response); }
  patch(url, query, body, full_response) { return this.api('PATCH', url, query, body, full_response); }
  put(url, query, body, full_response) { return this.api('PUT', url, query, body, full_response); }
  delete(url, query, full_response) { return this.api('DELETE', url, query, null, full_response); }
  upload(url, query, formData, full_response) {
    const data = {
      url: this.endpoint + url,
      qs: query,
      strictSSL: this.options.strictSSL,
      encoding: null,
      resolveWithFullResponse: true,
      formData
    };
    return this.checkAccessToken(query)
    .then(() => {
      return request.post(data);
  }).then(function(response) {
      let res_body;
      if (/application\/json/.test(response.headers['content-type'])) {
        res_body = JSON.parse(response.body.toString());
      } else {
        res_body = response.body;
      }
      if (full_response) {
        return Promise.resolve({
          headers: response.headers,
          status: response.statusCode,
          body: response.body
        });
      } else {
        return Promise.resolve(res_body);
      }}).catch(err => {
      if ((err.response != null) && /application\/json/.test(err.response.headers['content-type'])) {
        const res_body = JSON.parse(err.response.body.toString());
        if (res_body.error === 'invalid_access_token') {
          return this.getAccessToken()
          .then(() => {
            return this.api(method, url.replace(this.endpoint, ''), query, body, full_response);
          });
        } else {
          return Promise.reject(new PlayoffException(res_body.error, res_body.error_description, err.response.statusCode, err.response.headers, res_body.data));
        }
      } else {
        return Promise.reject(err);
      }
    });
  }
}

module.exports = {
  Playoff,
  PlayoffException
};
