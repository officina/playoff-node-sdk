
const client_id="M2EzOWU4ZjUtM2Q5Yi00ZmE0LTkxNjYtOWM3MmFkMGNjNTIx";
const client_secret="MDc2ZGE1YjgtM2FjYS00MGYwLTg2YTQtYjY0OWVjNTViNzJjYzg3ZTVlNzAtNTM4OS0xMWU4LTlmMzctMjE2MGI4MDQ1OGMx";

const {Playoff, PlayoffException} = require('../src/playoff');
const assert = require('assert');
const Promise = require('bluebird');
const jwt = require('jsonwebtoken');



pl = new Playoff({
    type: 'client',
    client_id,
    client_secret,
    version: 'v2',
    hostname:'playoffgamification.io',
    strictSSL: false
});

pl.get('/admin/players')
    .then(function(players) {
        console.log(players)

    });