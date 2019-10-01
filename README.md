![Playoff Node SDK](https://dev.playoffgamification.io/images/assets/pl-node-sdk.png "Playoff Node SDK")

Playoff Node SDK [![NPM version](https://badge.fury.io/js/playoff.svg)](https://www.npmjs.com/package/playoff)
=================

Playoff API implementation in NodeJS. This module integrates seamlessly with the [passport-playoff](https://github.com/playoff/passport-playoff) module for authentication support.

Visit the complete [API reference](http://dev.playoffgamification.io/docs/api)

To learn more about how you can build applications on Playoff visit the [official developer documentation](http://dev.playoffgamification.io)

##Install
To get started simply run

```sh
npm install playoff
```

The Playoff class allows you to make rest api calls like GET, POST, .. etc
```js
var Playoff = require('playoff').Playoff;
var PlayoffException = require('playoff').PlayoffException;
var pl = new Playoff({
    type: 'client'
    version: 'v1',
    client_id: "Your client id",
    client_secret: "Your client secret"
});

// To get infomation of the player johny
pl.get('/player',{ player_id: 'johny' }) 
.then(function(player) {
    console.log(player);
})
.catch(PlayoffException, function(err) {
    console.log('Name', err.name);
    console.log('Message', err.message);
    console.log('Status', err.status);
})
.catch(function(err) {
    console.log(err);
    console.log(err.response);
});

pl.post("/definitions/processes/collect", { 'player_id': 'johny' }, { 'name': 'My First Process' })
.then(function(process) {
    console.log(process);
});

```

## Usage
### Create a client
If you haven't created a client for your game yet just head over to [Playoff](http://playoffgamification.io) and login into your account, and go to the game settings and click on client.

## 1. Client Credentials Flow
In the client page select Yes for both the first and second questions
![client](https://cloud.githubusercontent.com/assets/1687946/7930229/2c2f14fe-0924-11e5-8c3b-5ba0c10f066f.png)
```js
var Playoff = require('playoff').Playoff;
var PlayoffException = require('playoff').PlayoffException;
var pl = new Playoff({
    type: 'client'
    version: 'v2',
    client_id: "Your client id",
    client_secret: "Your client secret",
    hostname: "yourplayoffinstallationdomain.com"
});
``
# Client Scopes
![Client](https://cloud.githubusercontent.com/assets/1687946/9349193/e00fe91c-465f-11e5-8094-6e03c64a662c.png)

Your client has certain access control restrictions. There are 3 kind of resources in the Playoff REST API they are

1.`/admin` -> routes for you to perform admin actions like making a player join a team

2.`/design` -> routes for you to make design changes programmatically

3.`/runtime` -> routes which the users will generally use like getting a player profile, playing an action

The resources accessible to this client can be configured to have a read permission that means only `GET` requests will work.

The resources accessible to this client can be configured to have a write permission that means only `POST`, `PATCH`, `PUT`, `DELETE` requests will work.

The version restriction is only for the design resource and can be used to restrict the client from accessing any version of the game design other than the one specified. By default it allows all.

If access to a route is not allowed and then you make a request to that route then you will get an error like this,
```json
{
  "error": "access_denied",
  "error_description": "You are not allowed to access this api route"
}
```

# Documentation
You can initiate a client by giving the client_id and client_secret params
```js
var Playoff = require('playoff').Playoff;
var PlayoffException = require('playoff').PlayoffException;
var pl = new Playoff({
    type: 'client' or 'code',
    client_id: 'Your client id',
    client_secret: 'Your client Secret',
    version: 'v1',
    redirect_uri: 'The url to redirect to', //only for auth code flow
    store: function(access_token, done) {
        //This function which will persist the access token to a database.
        //You  have to persist the token to a database if you want the access
        //token to remain the same in every request
        done(null, access_token);
    }, 
    load: function(done) {
        //This function which will load the access token. This is called 
        //internally by the sdk on every request so the the access token can 
        //be  persisted between requests
       done(null, access_token);
    }
});
```

In development the sdk caches the access token in memory so you dont need to provide the store and load functions. But in production it is highly recommended to persist the token to a database. It is very simple and easy to do it with redis. You can see the test cases for more examples.

```js
var Playoff = require('playoff').Playoff;
var PlayoffException = require('playoff').PlayoffException;
var redis = require('ioredis');

var pl = new Playoff({
    type: 'client' or 'code',
    client_id: 'Your client id',
    client_secret: 'Your client Secret',
    version: 'v1',
    store: function(access_token, done) {
        redis.hmset("access_token", access_token)
        .then(function(access_token) {
            done(null, access_token);
        });
    }, 
    load: function(done) {
        redis.hmgetall("access_token")
        .then(function(access_token) {
            done(null, access_token);
        });
    }
});
```

## Methods
All these methods return a bluebird Promise.
All these methods return the request data only when full_response is false
but return `headers`, `status`, `body` of the response when full_response is true.

**api (method, route, query, body, full_response = false)**  
This will allow you to make any HTTP method request to the Playoff API

**get (route, query, full_response = false)**  
This will make a GET request to the Playoff API

**post (route, query, body, full_response = false)**  
This will make a POST request to the Playoff API

**patch (route, query, body, full_response = false)**  
This will make a PATCH request to the Playoff API

**put (route, query, body, full_response = false)**  
This will make a PUT request to the Playoff API

**delete (route, query, full_response = false)**  
This will make a DELETE request to the Playoff API

**upload (url, query, formData, full_response)**  
This will upload any formData you want to send to the server like files, images etc.
Files need to be sent as streams like this,
`upload("/runtime/player/image", req.query, {file: fs.createReadStream(path) })`
This uses the [request](https://github.com/request/request) library so the pattern should be the same

**getAuthorizationURI ()**  
This will return the url to which the user needs to be redirected to login.
This doesn't need

**exchangeCode (code)**  
This is used in the auth code flow so that the sdk can get the access token.
Before any request to the playoff api is made this has to be called atleast once.This should be called in the the route/controller which you specified in your redirect_uri.

**PlayoffException**  
This is thrown whenever an error occurs in each call. The Error contains the `name`, `message`, `status`, `headers` and `data` fields which can be used to determine the type of error that occurred.

License
=======
Playoff NodeJS SDK  
http://dev.playoffgamification.io/  
Copyright(c) 2019, Officina S.r.l. support@playoffgamification.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
