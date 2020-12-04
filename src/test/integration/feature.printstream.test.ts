'use strict';

// Adapted from
// https://github.com/microsoft/vscode-languageserver-node/blob/master/client-node-tests/src/integration.test.ts

import { describe } from 'mocha';

import fs = require('graceful-fs');
import os = require('os');
import tmp = require('tmp');
import path = require('path');
import { FeatureName } from '../../printstream/constants';

describe(FeatureName, function () {
});