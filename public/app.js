'use strict';

angular.module('findme', ['ngNewRouter', 'findme.map'])
    .controller('AppController', AppController)
;

function AppController($router) {
    $router.config([
        {path: '/', component: 'map'}
    ]);
}