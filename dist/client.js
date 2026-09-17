window.__ModuleLoader__.load({ id: "darask-harness", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/jsqr/dist/jsQR.js
var require_jsQR = __commonJS({
  "node_modules/jsqr/dist/jsQR.js"(exports, module2) {
    (function webpackUniversalModuleDefinition(root, factory) {
      if (typeof exports === "object" && typeof module2 === "object")
        module2.exports = factory();
      else if (typeof define === "function" && define.amd)
        define([], factory);
      else if (typeof exports === "object")
        exports["jsQR"] = factory();
      else
        root["jsQR"] = factory();
    })(typeof self !== "undefined" ? self : exports, function() {
      return (
        /******/
        (function(modules) {
          var installedModules = {};
          function __webpack_require__(moduleId) {
            if (installedModules[moduleId]) {
              return installedModules[moduleId].exports;
            }
            var module3 = installedModules[moduleId] = {
              /******/
              i: moduleId,
              /******/
              l: false,
              /******/
              exports: {}
              /******/
            };
            modules[moduleId].call(module3.exports, module3, module3.exports, __webpack_require__);
            module3.l = true;
            return module3.exports;
          }
          __webpack_require__.m = modules;
          __webpack_require__.c = installedModules;
          __webpack_require__.d = function(exports2, name2, getter) {
            if (!__webpack_require__.o(exports2, name2)) {
              Object.defineProperty(exports2, name2, {
                /******/
                configurable: false,
                /******/
                enumerable: true,
                /******/
                get: getter
                /******/
              });
            }
          };
          __webpack_require__.n = function(module3) {
            var getter = module3 && module3.__esModule ? (
              /******/
              function getDefault() {
                return module3["default"];
              }
            ) : (
              /******/
              function getModuleExports() {
                return module3;
              }
            );
            __webpack_require__.d(getter, "a", getter);
            return getter;
          };
          __webpack_require__.o = function(object, property) {
            return Object.prototype.hasOwnProperty.call(object, property);
          };
          __webpack_require__.p = "";
          return __webpack_require__(__webpack_require__.s = 3);
        })([
          /* 0 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var BitMatrix = (
              /** @class */
              (function() {
                function BitMatrix2(data, width) {
                  this.width = width;
                  this.height = data.length / width;
                  this.data = data;
                }
                BitMatrix2.createEmpty = function(width, height) {
                  return new BitMatrix2(new Uint8ClampedArray(width * height), width);
                };
                BitMatrix2.prototype.get = function(x, y) {
                  if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                    return false;
                  }
                  return !!this.data[y * this.width + x];
                };
                BitMatrix2.prototype.set = function(x, y, v) {
                  this.data[y * this.width + x] = v ? 1 : 0;
                };
                BitMatrix2.prototype.setRegion = function(left, top, width, height, v) {
                  for (var y = top; y < top + height; y++) {
                    for (var x = left; x < left + width; x++) {
                      this.set(x, y, !!v);
                    }
                  }
                };
                return BitMatrix2;
              })()
            );
            exports2.BitMatrix = BitMatrix;
          }),
          /* 1 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var GenericGFPoly_1 = __webpack_require__(2);
            function addOrSubtractGF(a, b) {
              return a ^ b;
            }
            exports2.addOrSubtractGF = addOrSubtractGF;
            var GenericGF = (
              /** @class */
              (function() {
                function GenericGF2(primitive, size, genBase) {
                  this.primitive = primitive;
                  this.size = size;
                  this.generatorBase = genBase;
                  this.expTable = new Array(this.size);
                  this.logTable = new Array(this.size);
                  var x = 1;
                  for (var i = 0; i < this.size; i++) {
                    this.expTable[i] = x;
                    x = x * 2;
                    if (x >= this.size) {
                      x = (x ^ this.primitive) & this.size - 1;
                    }
                  }
                  for (var i = 0; i < this.size - 1; i++) {
                    this.logTable[this.expTable[i]] = i;
                  }
                  this.zero = new GenericGFPoly_1.default(this, Uint8ClampedArray.from([0]));
                  this.one = new GenericGFPoly_1.default(this, Uint8ClampedArray.from([1]));
                }
                GenericGF2.prototype.multiply = function(a, b) {
                  if (a === 0 || b === 0) {
                    return 0;
                  }
                  return this.expTable[(this.logTable[a] + this.logTable[b]) % (this.size - 1)];
                };
                GenericGF2.prototype.inverse = function(a) {
                  if (a === 0) {
                    throw new Error("Can't invert 0");
                  }
                  return this.expTable[this.size - this.logTable[a] - 1];
                };
                GenericGF2.prototype.buildMonomial = function(degree, coefficient) {
                  if (degree < 0) {
                    throw new Error("Invalid monomial degree less than 0");
                  }
                  if (coefficient === 0) {
                    return this.zero;
                  }
                  var coefficients = new Uint8ClampedArray(degree + 1);
                  coefficients[0] = coefficient;
                  return new GenericGFPoly_1.default(this, coefficients);
                };
                GenericGF2.prototype.log = function(a) {
                  if (a === 0) {
                    throw new Error("Can't take log(0)");
                  }
                  return this.logTable[a];
                };
                GenericGF2.prototype.exp = function(a) {
                  return this.expTable[a];
                };
                return GenericGF2;
              })()
            );
            exports2.default = GenericGF;
          }),
          /* 2 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var GenericGF_1 = __webpack_require__(1);
            var GenericGFPoly = (
              /** @class */
              (function() {
                function GenericGFPoly2(field, coefficients) {
                  if (coefficients.length === 0) {
                    throw new Error("No coefficients.");
                  }
                  this.field = field;
                  var coefficientsLength = coefficients.length;
                  if (coefficientsLength > 1 && coefficients[0] === 0) {
                    var firstNonZero = 1;
                    while (firstNonZero < coefficientsLength && coefficients[firstNonZero] === 0) {
                      firstNonZero++;
                    }
                    if (firstNonZero === coefficientsLength) {
                      this.coefficients = field.zero.coefficients;
                    } else {
                      this.coefficients = new Uint8ClampedArray(coefficientsLength - firstNonZero);
                      for (var i = 0; i < this.coefficients.length; i++) {
                        this.coefficients[i] = coefficients[firstNonZero + i];
                      }
                    }
                  } else {
                    this.coefficients = coefficients;
                  }
                }
                GenericGFPoly2.prototype.degree = function() {
                  return this.coefficients.length - 1;
                };
                GenericGFPoly2.prototype.isZero = function() {
                  return this.coefficients[0] === 0;
                };
                GenericGFPoly2.prototype.getCoefficient = function(degree) {
                  return this.coefficients[this.coefficients.length - 1 - degree];
                };
                GenericGFPoly2.prototype.addOrSubtract = function(other) {
                  var _a;
                  if (this.isZero()) {
                    return other;
                  }
                  if (other.isZero()) {
                    return this;
                  }
                  var smallerCoefficients = this.coefficients;
                  var largerCoefficients = other.coefficients;
                  if (smallerCoefficients.length > largerCoefficients.length) {
                    _a = [largerCoefficients, smallerCoefficients], smallerCoefficients = _a[0], largerCoefficients = _a[1];
                  }
                  var sumDiff = new Uint8ClampedArray(largerCoefficients.length);
                  var lengthDiff = largerCoefficients.length - smallerCoefficients.length;
                  for (var i = 0; i < lengthDiff; i++) {
                    sumDiff[i] = largerCoefficients[i];
                  }
                  for (var i = lengthDiff; i < largerCoefficients.length; i++) {
                    sumDiff[i] = GenericGF_1.addOrSubtractGF(smallerCoefficients[i - lengthDiff], largerCoefficients[i]);
                  }
                  return new GenericGFPoly2(this.field, sumDiff);
                };
                GenericGFPoly2.prototype.multiply = function(scalar) {
                  if (scalar === 0) {
                    return this.field.zero;
                  }
                  if (scalar === 1) {
                    return this;
                  }
                  var size = this.coefficients.length;
                  var product = new Uint8ClampedArray(size);
                  for (var i = 0; i < size; i++) {
                    product[i] = this.field.multiply(this.coefficients[i], scalar);
                  }
                  return new GenericGFPoly2(this.field, product);
                };
                GenericGFPoly2.prototype.multiplyPoly = function(other) {
                  if (this.isZero() || other.isZero()) {
                    return this.field.zero;
                  }
                  var aCoefficients = this.coefficients;
                  var aLength = aCoefficients.length;
                  var bCoefficients = other.coefficients;
                  var bLength = bCoefficients.length;
                  var product = new Uint8ClampedArray(aLength + bLength - 1);
                  for (var i = 0; i < aLength; i++) {
                    var aCoeff = aCoefficients[i];
                    for (var j = 0; j < bLength; j++) {
                      product[i + j] = GenericGF_1.addOrSubtractGF(product[i + j], this.field.multiply(aCoeff, bCoefficients[j]));
                    }
                  }
                  return new GenericGFPoly2(this.field, product);
                };
                GenericGFPoly2.prototype.multiplyByMonomial = function(degree, coefficient) {
                  if (degree < 0) {
                    throw new Error("Invalid degree less than 0");
                  }
                  if (coefficient === 0) {
                    return this.field.zero;
                  }
                  var size = this.coefficients.length;
                  var product = new Uint8ClampedArray(size + degree);
                  for (var i = 0; i < size; i++) {
                    product[i] = this.field.multiply(this.coefficients[i], coefficient);
                  }
                  return new GenericGFPoly2(this.field, product);
                };
                GenericGFPoly2.prototype.evaluateAt = function(a) {
                  var result = 0;
                  if (a === 0) {
                    return this.getCoefficient(0);
                  }
                  var size = this.coefficients.length;
                  if (a === 1) {
                    this.coefficients.forEach(function(coefficient) {
                      result = GenericGF_1.addOrSubtractGF(result, coefficient);
                    });
                    return result;
                  }
                  result = this.coefficients[0];
                  for (var i = 1; i < size; i++) {
                    result = GenericGF_1.addOrSubtractGF(this.field.multiply(a, result), this.coefficients[i]);
                  }
                  return result;
                };
                return GenericGFPoly2;
              })()
            );
            exports2.default = GenericGFPoly;
          }),
          /* 3 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var binarizer_1 = __webpack_require__(4);
            var decoder_1 = __webpack_require__(5);
            var extractor_1 = __webpack_require__(11);
            var locator_1 = __webpack_require__(12);
            function scan(matrix) {
              var locations = locator_1.locate(matrix);
              if (!locations) {
                return null;
              }
              for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                var location_1 = locations_1[_i];
                var extracted = extractor_1.extract(matrix, location_1);
                var decoded = decoder_1.decode(extracted.matrix);
                if (decoded) {
                  return {
                    binaryData: decoded.bytes,
                    data: decoded.text,
                    chunks: decoded.chunks,
                    version: decoded.version,
                    location: {
                      topRightCorner: extracted.mappingFunction(location_1.dimension, 0),
                      topLeftCorner: extracted.mappingFunction(0, 0),
                      bottomRightCorner: extracted.mappingFunction(location_1.dimension, location_1.dimension),
                      bottomLeftCorner: extracted.mappingFunction(0, location_1.dimension),
                      topRightFinderPattern: location_1.topRight,
                      topLeftFinderPattern: location_1.topLeft,
                      bottomLeftFinderPattern: location_1.bottomLeft,
                      bottomRightAlignmentPattern: location_1.alignmentPattern
                    }
                  };
                }
              }
              return null;
            }
            var defaultOptions = {
              inversionAttempts: "attemptBoth"
            };
            function jsQR2(data, width, height, providedOptions) {
              if (providedOptions === void 0) {
                providedOptions = {};
              }
              var options = defaultOptions;
              Object.keys(options || {}).forEach(function(opt) {
                options[opt] = providedOptions[opt] || options[opt];
              });
              var shouldInvert = options.inversionAttempts === "attemptBoth" || options.inversionAttempts === "invertFirst";
              var tryInvertedFirst = options.inversionAttempts === "onlyInvert" || options.inversionAttempts === "invertFirst";
              var _a = binarizer_1.binarize(data, width, height, shouldInvert), binarized = _a.binarized, inverted = _a.inverted;
              var result = scan(tryInvertedFirst ? inverted : binarized);
              if (!result && (options.inversionAttempts === "attemptBoth" || options.inversionAttempts === "invertFirst")) {
                result = scan(tryInvertedFirst ? binarized : inverted);
              }
              return result;
            }
            jsQR2.default = jsQR2;
            exports2.default = jsQR2;
          }),
          /* 4 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var BitMatrix_1 = __webpack_require__(0);
            var REGION_SIZE = 8;
            var MIN_DYNAMIC_RANGE = 24;
            function numBetween(value, min, max) {
              return value < min ? min : value > max ? max : value;
            }
            var Matrix = (
              /** @class */
              (function() {
                function Matrix2(width, height) {
                  this.width = width;
                  this.data = new Uint8ClampedArray(width * height);
                }
                Matrix2.prototype.get = function(x, y) {
                  return this.data[y * this.width + x];
                };
                Matrix2.prototype.set = function(x, y, value) {
                  this.data[y * this.width + x] = value;
                };
                return Matrix2;
              })()
            );
            function binarize(data, width, height, returnInverted) {
              if (data.length !== width * height * 4) {
                throw new Error("Malformed data passed to binarizer.");
              }
              var greyscalePixels = new Matrix(width, height);
              for (var x = 0; x < width; x++) {
                for (var y = 0; y < height; y++) {
                  var r = data[(y * width + x) * 4 + 0];
                  var g = data[(y * width + x) * 4 + 1];
                  var b = data[(y * width + x) * 4 + 2];
                  greyscalePixels.set(x, y, 0.2126 * r + 0.7152 * g + 0.0722 * b);
                }
              }
              var horizontalRegionCount = Math.ceil(width / REGION_SIZE);
              var verticalRegionCount = Math.ceil(height / REGION_SIZE);
              var blackPoints = new Matrix(horizontalRegionCount, verticalRegionCount);
              for (var verticalRegion = 0; verticalRegion < verticalRegionCount; verticalRegion++) {
                for (var hortizontalRegion = 0; hortizontalRegion < horizontalRegionCount; hortizontalRegion++) {
                  var sum = 0;
                  var min = Infinity;
                  var max = 0;
                  for (var y = 0; y < REGION_SIZE; y++) {
                    for (var x = 0; x < REGION_SIZE; x++) {
                      var pixelLumosity = greyscalePixels.get(hortizontalRegion * REGION_SIZE + x, verticalRegion * REGION_SIZE + y);
                      sum += pixelLumosity;
                      min = Math.min(min, pixelLumosity);
                      max = Math.max(max, pixelLumosity);
                    }
                  }
                  var average = sum / Math.pow(REGION_SIZE, 2);
                  if (max - min <= MIN_DYNAMIC_RANGE) {
                    average = min / 2;
                    if (verticalRegion > 0 && hortizontalRegion > 0) {
                      var averageNeighborBlackPoint = (blackPoints.get(hortizontalRegion, verticalRegion - 1) + 2 * blackPoints.get(hortizontalRegion - 1, verticalRegion) + blackPoints.get(hortizontalRegion - 1, verticalRegion - 1)) / 4;
                      if (min < averageNeighborBlackPoint) {
                        average = averageNeighborBlackPoint;
                      }
                    }
                  }
                  blackPoints.set(hortizontalRegion, verticalRegion, average);
                }
              }
              var binarized = BitMatrix_1.BitMatrix.createEmpty(width, height);
              var inverted = null;
              if (returnInverted) {
                inverted = BitMatrix_1.BitMatrix.createEmpty(width, height);
              }
              for (var verticalRegion = 0; verticalRegion < verticalRegionCount; verticalRegion++) {
                for (var hortizontalRegion = 0; hortizontalRegion < horizontalRegionCount; hortizontalRegion++) {
                  var left = numBetween(hortizontalRegion, 2, horizontalRegionCount - 3);
                  var top_1 = numBetween(verticalRegion, 2, verticalRegionCount - 3);
                  var sum = 0;
                  for (var xRegion = -2; xRegion <= 2; xRegion++) {
                    for (var yRegion = -2; yRegion <= 2; yRegion++) {
                      sum += blackPoints.get(left + xRegion, top_1 + yRegion);
                    }
                  }
                  var threshold = sum / 25;
                  for (var xRegion = 0; xRegion < REGION_SIZE; xRegion++) {
                    for (var yRegion = 0; yRegion < REGION_SIZE; yRegion++) {
                      var x = hortizontalRegion * REGION_SIZE + xRegion;
                      var y = verticalRegion * REGION_SIZE + yRegion;
                      var lum = greyscalePixels.get(x, y);
                      binarized.set(x, y, lum <= threshold);
                      if (returnInverted) {
                        inverted.set(x, y, !(lum <= threshold));
                      }
                    }
                  }
                }
              }
              if (returnInverted) {
                return { binarized, inverted };
              }
              return { binarized };
            }
            exports2.binarize = binarize;
          }),
          /* 5 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var BitMatrix_1 = __webpack_require__(0);
            var decodeData_1 = __webpack_require__(6);
            var reedsolomon_1 = __webpack_require__(9);
            var version_1 = __webpack_require__(10);
            function numBitsDiffering(x, y) {
              var z = x ^ y;
              var bitCount = 0;
              while (z) {
                bitCount++;
                z &= z - 1;
              }
              return bitCount;
            }
            function pushBit(bit, byte) {
              return byte << 1 | bit;
            }
            var FORMAT_INFO_TABLE = [
              { bits: 21522, formatInfo: { errorCorrectionLevel: 1, dataMask: 0 } },
              { bits: 20773, formatInfo: { errorCorrectionLevel: 1, dataMask: 1 } },
              { bits: 24188, formatInfo: { errorCorrectionLevel: 1, dataMask: 2 } },
              { bits: 23371, formatInfo: { errorCorrectionLevel: 1, dataMask: 3 } },
              { bits: 17913, formatInfo: { errorCorrectionLevel: 1, dataMask: 4 } },
              { bits: 16590, formatInfo: { errorCorrectionLevel: 1, dataMask: 5 } },
              { bits: 20375, formatInfo: { errorCorrectionLevel: 1, dataMask: 6 } },
              { bits: 19104, formatInfo: { errorCorrectionLevel: 1, dataMask: 7 } },
              { bits: 30660, formatInfo: { errorCorrectionLevel: 0, dataMask: 0 } },
              { bits: 29427, formatInfo: { errorCorrectionLevel: 0, dataMask: 1 } },
              { bits: 32170, formatInfo: { errorCorrectionLevel: 0, dataMask: 2 } },
              { bits: 30877, formatInfo: { errorCorrectionLevel: 0, dataMask: 3 } },
              { bits: 26159, formatInfo: { errorCorrectionLevel: 0, dataMask: 4 } },
              { bits: 25368, formatInfo: { errorCorrectionLevel: 0, dataMask: 5 } },
              { bits: 27713, formatInfo: { errorCorrectionLevel: 0, dataMask: 6 } },
              { bits: 26998, formatInfo: { errorCorrectionLevel: 0, dataMask: 7 } },
              { bits: 5769, formatInfo: { errorCorrectionLevel: 3, dataMask: 0 } },
              { bits: 5054, formatInfo: { errorCorrectionLevel: 3, dataMask: 1 } },
              { bits: 7399, formatInfo: { errorCorrectionLevel: 3, dataMask: 2 } },
              { bits: 6608, formatInfo: { errorCorrectionLevel: 3, dataMask: 3 } },
              { bits: 1890, formatInfo: { errorCorrectionLevel: 3, dataMask: 4 } },
              { bits: 597, formatInfo: { errorCorrectionLevel: 3, dataMask: 5 } },
              { bits: 3340, formatInfo: { errorCorrectionLevel: 3, dataMask: 6 } },
              { bits: 2107, formatInfo: { errorCorrectionLevel: 3, dataMask: 7 } },
              { bits: 13663, formatInfo: { errorCorrectionLevel: 2, dataMask: 0 } },
              { bits: 12392, formatInfo: { errorCorrectionLevel: 2, dataMask: 1 } },
              { bits: 16177, formatInfo: { errorCorrectionLevel: 2, dataMask: 2 } },
              { bits: 14854, formatInfo: { errorCorrectionLevel: 2, dataMask: 3 } },
              { bits: 9396, formatInfo: { errorCorrectionLevel: 2, dataMask: 4 } },
              { bits: 8579, formatInfo: { errorCorrectionLevel: 2, dataMask: 5 } },
              { bits: 11994, formatInfo: { errorCorrectionLevel: 2, dataMask: 6 } },
              { bits: 11245, formatInfo: { errorCorrectionLevel: 2, dataMask: 7 } }
            ];
            var DATA_MASKS = [
              function(p) {
                return (p.y + p.x) % 2 === 0;
              },
              function(p) {
                return p.y % 2 === 0;
              },
              function(p) {
                return p.x % 3 === 0;
              },
              function(p) {
                return (p.y + p.x) % 3 === 0;
              },
              function(p) {
                return (Math.floor(p.y / 2) + Math.floor(p.x / 3)) % 2 === 0;
              },
              function(p) {
                return p.x * p.y % 2 + p.x * p.y % 3 === 0;
              },
              function(p) {
                return (p.y * p.x % 2 + p.y * p.x % 3) % 2 === 0;
              },
              function(p) {
                return ((p.y + p.x) % 2 + p.y * p.x % 3) % 2 === 0;
              }
            ];
            function buildFunctionPatternMask(version) {
              var dimension = 17 + 4 * version.versionNumber;
              var matrix = BitMatrix_1.BitMatrix.createEmpty(dimension, dimension);
              matrix.setRegion(0, 0, 9, 9, true);
              matrix.setRegion(dimension - 8, 0, 8, 9, true);
              matrix.setRegion(0, dimension - 8, 9, 8, true);
              for (var _i = 0, _a = version.alignmentPatternCenters; _i < _a.length; _i++) {
                var x = _a[_i];
                for (var _b = 0, _c = version.alignmentPatternCenters; _b < _c.length; _b++) {
                  var y = _c[_b];
                  if (!(x === 6 && y === 6 || x === 6 && y === dimension - 7 || x === dimension - 7 && y === 6)) {
                    matrix.setRegion(x - 2, y - 2, 5, 5, true);
                  }
                }
              }
              matrix.setRegion(6, 9, 1, dimension - 17, true);
              matrix.setRegion(9, 6, dimension - 17, 1, true);
              if (version.versionNumber > 6) {
                matrix.setRegion(dimension - 11, 0, 3, 6, true);
                matrix.setRegion(0, dimension - 11, 6, 3, true);
              }
              return matrix;
            }
            function readCodewords(matrix, version, formatInfo) {
              var dataMask = DATA_MASKS[formatInfo.dataMask];
              var dimension = matrix.height;
              var functionPatternMask = buildFunctionPatternMask(version);
              var codewords = [];
              var currentByte = 0;
              var bitsRead = 0;
              var readingUp = true;
              for (var columnIndex = dimension - 1; columnIndex > 0; columnIndex -= 2) {
                if (columnIndex === 6) {
                  columnIndex--;
                }
                for (var i = 0; i < dimension; i++) {
                  var y = readingUp ? dimension - 1 - i : i;
                  for (var columnOffset = 0; columnOffset < 2; columnOffset++) {
                    var x = columnIndex - columnOffset;
                    if (!functionPatternMask.get(x, y)) {
                      bitsRead++;
                      var bit = matrix.get(x, y);
                      if (dataMask({ y, x })) {
                        bit = !bit;
                      }
                      currentByte = pushBit(bit, currentByte);
                      if (bitsRead === 8) {
                        codewords.push(currentByte);
                        bitsRead = 0;
                        currentByte = 0;
                      }
                    }
                  }
                }
                readingUp = !readingUp;
              }
              return codewords;
            }
            function readVersion(matrix) {
              var dimension = matrix.height;
              var provisionalVersion = Math.floor((dimension - 17) / 4);
              if (provisionalVersion <= 6) {
                return version_1.VERSIONS[provisionalVersion - 1];
              }
              var topRightVersionBits = 0;
              for (var y = 5; y >= 0; y--) {
                for (var x = dimension - 9; x >= dimension - 11; x--) {
                  topRightVersionBits = pushBit(matrix.get(x, y), topRightVersionBits);
                }
              }
              var bottomLeftVersionBits = 0;
              for (var x = 5; x >= 0; x--) {
                for (var y = dimension - 9; y >= dimension - 11; y--) {
                  bottomLeftVersionBits = pushBit(matrix.get(x, y), bottomLeftVersionBits);
                }
              }
              var bestDifference = Infinity;
              var bestVersion;
              for (var _i = 0, VERSIONS_1 = version_1.VERSIONS; _i < VERSIONS_1.length; _i++) {
                var version = VERSIONS_1[_i];
                if (version.infoBits === topRightVersionBits || version.infoBits === bottomLeftVersionBits) {
                  return version;
                }
                var difference = numBitsDiffering(topRightVersionBits, version.infoBits);
                if (difference < bestDifference) {
                  bestVersion = version;
                  bestDifference = difference;
                }
                difference = numBitsDiffering(bottomLeftVersionBits, version.infoBits);
                if (difference < bestDifference) {
                  bestVersion = version;
                  bestDifference = difference;
                }
              }
              if (bestDifference <= 3) {
                return bestVersion;
              }
            }
            function readFormatInformation(matrix) {
              var topLeftFormatInfoBits = 0;
              for (var x = 0; x <= 8; x++) {
                if (x !== 6) {
                  topLeftFormatInfoBits = pushBit(matrix.get(x, 8), topLeftFormatInfoBits);
                }
              }
              for (var y = 7; y >= 0; y--) {
                if (y !== 6) {
                  topLeftFormatInfoBits = pushBit(matrix.get(8, y), topLeftFormatInfoBits);
                }
              }
              var dimension = matrix.height;
              var topRightBottomRightFormatInfoBits = 0;
              for (var y = dimension - 1; y >= dimension - 7; y--) {
                topRightBottomRightFormatInfoBits = pushBit(matrix.get(8, y), topRightBottomRightFormatInfoBits);
              }
              for (var x = dimension - 8; x < dimension; x++) {
                topRightBottomRightFormatInfoBits = pushBit(matrix.get(x, 8), topRightBottomRightFormatInfoBits);
              }
              var bestDifference = Infinity;
              var bestFormatInfo = null;
              for (var _i = 0, FORMAT_INFO_TABLE_1 = FORMAT_INFO_TABLE; _i < FORMAT_INFO_TABLE_1.length; _i++) {
                var _a = FORMAT_INFO_TABLE_1[_i], bits = _a.bits, formatInfo = _a.formatInfo;
                if (bits === topLeftFormatInfoBits || bits === topRightBottomRightFormatInfoBits) {
                  return formatInfo;
                }
                var difference = numBitsDiffering(topLeftFormatInfoBits, bits);
                if (difference < bestDifference) {
                  bestFormatInfo = formatInfo;
                  bestDifference = difference;
                }
                if (topLeftFormatInfoBits !== topRightBottomRightFormatInfoBits) {
                  difference = numBitsDiffering(topRightBottomRightFormatInfoBits, bits);
                  if (difference < bestDifference) {
                    bestFormatInfo = formatInfo;
                    bestDifference = difference;
                  }
                }
              }
              if (bestDifference <= 3) {
                return bestFormatInfo;
              }
              return null;
            }
            function getDataBlocks(codewords, version, ecLevel) {
              var ecInfo = version.errorCorrectionLevels[ecLevel];
              var dataBlocks = [];
              var totalCodewords = 0;
              ecInfo.ecBlocks.forEach(function(block) {
                for (var i2 = 0; i2 < block.numBlocks; i2++) {
                  dataBlocks.push({ numDataCodewords: block.dataCodewordsPerBlock, codewords: [] });
                  totalCodewords += block.dataCodewordsPerBlock + ecInfo.ecCodewordsPerBlock;
                }
              });
              if (codewords.length < totalCodewords) {
                return null;
              }
              codewords = codewords.slice(0, totalCodewords);
              var shortBlockSize = ecInfo.ecBlocks[0].dataCodewordsPerBlock;
              for (var i = 0; i < shortBlockSize; i++) {
                for (var _i = 0, dataBlocks_1 = dataBlocks; _i < dataBlocks_1.length; _i++) {
                  var dataBlock = dataBlocks_1[_i];
                  dataBlock.codewords.push(codewords.shift());
                }
              }
              if (ecInfo.ecBlocks.length > 1) {
                var smallBlockCount = ecInfo.ecBlocks[0].numBlocks;
                var largeBlockCount = ecInfo.ecBlocks[1].numBlocks;
                for (var i = 0; i < largeBlockCount; i++) {
                  dataBlocks[smallBlockCount + i].codewords.push(codewords.shift());
                }
              }
              while (codewords.length > 0) {
                for (var _a = 0, dataBlocks_2 = dataBlocks; _a < dataBlocks_2.length; _a++) {
                  var dataBlock = dataBlocks_2[_a];
                  dataBlock.codewords.push(codewords.shift());
                }
              }
              return dataBlocks;
            }
            function decodeMatrix(matrix) {
              var version = readVersion(matrix);
              if (!version) {
                return null;
              }
              var formatInfo = readFormatInformation(matrix);
              if (!formatInfo) {
                return null;
              }
              var codewords = readCodewords(matrix, version, formatInfo);
              var dataBlocks = getDataBlocks(codewords, version, formatInfo.errorCorrectionLevel);
              if (!dataBlocks) {
                return null;
              }
              var totalBytes = dataBlocks.reduce(function(a, b) {
                return a + b.numDataCodewords;
              }, 0);
              var resultBytes = new Uint8ClampedArray(totalBytes);
              var resultIndex = 0;
              for (var _i = 0, dataBlocks_3 = dataBlocks; _i < dataBlocks_3.length; _i++) {
                var dataBlock = dataBlocks_3[_i];
                var correctedBytes = reedsolomon_1.decode(dataBlock.codewords, dataBlock.codewords.length - dataBlock.numDataCodewords);
                if (!correctedBytes) {
                  return null;
                }
                for (var i = 0; i < dataBlock.numDataCodewords; i++) {
                  resultBytes[resultIndex++] = correctedBytes[i];
                }
              }
              try {
                return decodeData_1.decode(resultBytes, version.versionNumber);
              } catch (_a) {
                return null;
              }
            }
            function decode(matrix) {
              if (matrix == null) {
                return null;
              }
              var result = decodeMatrix(matrix);
              if (result) {
                return result;
              }
              for (var x = 0; x < matrix.width; x++) {
                for (var y = x + 1; y < matrix.height; y++) {
                  if (matrix.get(x, y) !== matrix.get(y, x)) {
                    matrix.set(x, y, !matrix.get(x, y));
                    matrix.set(y, x, !matrix.get(y, x));
                  }
                }
              }
              return decodeMatrix(matrix);
            }
            exports2.decode = decode;
          }),
          /* 6 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var BitStream_1 = __webpack_require__(7);
            var shiftJISTable_1 = __webpack_require__(8);
            var Mode;
            (function(Mode2) {
              Mode2["Numeric"] = "numeric";
              Mode2["Alphanumeric"] = "alphanumeric";
              Mode2["Byte"] = "byte";
              Mode2["Kanji"] = "kanji";
              Mode2["ECI"] = "eci";
            })(Mode = exports2.Mode || (exports2.Mode = {}));
            var ModeByte;
            (function(ModeByte2) {
              ModeByte2[ModeByte2["Terminator"] = 0] = "Terminator";
              ModeByte2[ModeByte2["Numeric"] = 1] = "Numeric";
              ModeByte2[ModeByte2["Alphanumeric"] = 2] = "Alphanumeric";
              ModeByte2[ModeByte2["Byte"] = 4] = "Byte";
              ModeByte2[ModeByte2["Kanji"] = 8] = "Kanji";
              ModeByte2[ModeByte2["ECI"] = 7] = "ECI";
            })(ModeByte || (ModeByte = {}));
            function decodeNumeric(stream, size) {
              var bytes = [];
              var text = "";
              var characterCountSize = [10, 12, 14][size];
              var length = stream.readBits(characterCountSize);
              while (length >= 3) {
                var num = stream.readBits(10);
                if (num >= 1e3) {
                  throw new Error("Invalid numeric value above 999");
                }
                var a = Math.floor(num / 100);
                var b = Math.floor(num / 10) % 10;
                var c = num % 10;
                bytes.push(48 + a, 48 + b, 48 + c);
                text += a.toString() + b.toString() + c.toString();
                length -= 3;
              }
              if (length === 2) {
                var num = stream.readBits(7);
                if (num >= 100) {
                  throw new Error("Invalid numeric value above 99");
                }
                var a = Math.floor(num / 10);
                var b = num % 10;
                bytes.push(48 + a, 48 + b);
                text += a.toString() + b.toString();
              } else if (length === 1) {
                var num = stream.readBits(4);
                if (num >= 10) {
                  throw new Error("Invalid numeric value above 9");
                }
                bytes.push(48 + num);
                text += num.toString();
              }
              return { bytes, text };
            }
            var AlphanumericCharacterCodes = [
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K",
              "L",
              "M",
              "N",
              "O",
              "P",
              "Q",
              "R",
              "S",
              "T",
              "U",
              "V",
              "W",
              "X",
              "Y",
              "Z",
              " ",
              "$",
              "%",
              "*",
              "+",
              "-",
              ".",
              "/",
              ":"
            ];
            function decodeAlphanumeric(stream, size) {
              var bytes = [];
              var text = "";
              var characterCountSize = [9, 11, 13][size];
              var length = stream.readBits(characterCountSize);
              while (length >= 2) {
                var v = stream.readBits(11);
                var a = Math.floor(v / 45);
                var b = v % 45;
                bytes.push(AlphanumericCharacterCodes[a].charCodeAt(0), AlphanumericCharacterCodes[b].charCodeAt(0));
                text += AlphanumericCharacterCodes[a] + AlphanumericCharacterCodes[b];
                length -= 2;
              }
              if (length === 1) {
                var a = stream.readBits(6);
                bytes.push(AlphanumericCharacterCodes[a].charCodeAt(0));
                text += AlphanumericCharacterCodes[a];
              }
              return { bytes, text };
            }
            function decodeByte(stream, size) {
              var bytes = [];
              var text = "";
              var characterCountSize = [8, 16, 16][size];
              var length = stream.readBits(characterCountSize);
              for (var i = 0; i < length; i++) {
                var b = stream.readBits(8);
                bytes.push(b);
              }
              try {
                text += decodeURIComponent(bytes.map(function(b2) {
                  return "%" + ("0" + b2.toString(16)).substr(-2);
                }).join(""));
              } catch (_a) {
              }
              return { bytes, text };
            }
            function decodeKanji(stream, size) {
              var bytes = [];
              var text = "";
              var characterCountSize = [8, 10, 12][size];
              var length = stream.readBits(characterCountSize);
              for (var i = 0; i < length; i++) {
                var k = stream.readBits(13);
                var c = Math.floor(k / 192) << 8 | k % 192;
                if (c < 7936) {
                  c += 33088;
                } else {
                  c += 49472;
                }
                bytes.push(c >> 8, c & 255);
                text += String.fromCharCode(shiftJISTable_1.shiftJISTable[c]);
              }
              return { bytes, text };
            }
            function decode(data, version) {
              var _a, _b, _c, _d;
              var stream = new BitStream_1.BitStream(data);
              var size = version <= 9 ? 0 : version <= 26 ? 1 : 2;
              var result = {
                text: "",
                bytes: [],
                chunks: [],
                version
              };
              while (stream.available() >= 4) {
                var mode = stream.readBits(4);
                if (mode === ModeByte.Terminator) {
                  return result;
                } else if (mode === ModeByte.ECI) {
                  if (stream.readBits(1) === 0) {
                    result.chunks.push({
                      type: Mode.ECI,
                      assignmentNumber: stream.readBits(7)
                    });
                  } else if (stream.readBits(1) === 0) {
                    result.chunks.push({
                      type: Mode.ECI,
                      assignmentNumber: stream.readBits(14)
                    });
                  } else if (stream.readBits(1) === 0) {
                    result.chunks.push({
                      type: Mode.ECI,
                      assignmentNumber: stream.readBits(21)
                    });
                  } else {
                    result.chunks.push({
                      type: Mode.ECI,
                      assignmentNumber: -1
                    });
                  }
                } else if (mode === ModeByte.Numeric) {
                  var numericResult = decodeNumeric(stream, size);
                  result.text += numericResult.text;
                  (_a = result.bytes).push.apply(_a, numericResult.bytes);
                  result.chunks.push({
                    type: Mode.Numeric,
                    text: numericResult.text
                  });
                } else if (mode === ModeByte.Alphanumeric) {
                  var alphanumericResult = decodeAlphanumeric(stream, size);
                  result.text += alphanumericResult.text;
                  (_b = result.bytes).push.apply(_b, alphanumericResult.bytes);
                  result.chunks.push({
                    type: Mode.Alphanumeric,
                    text: alphanumericResult.text
                  });
                } else if (mode === ModeByte.Byte) {
                  var byteResult = decodeByte(stream, size);
                  result.text += byteResult.text;
                  (_c = result.bytes).push.apply(_c, byteResult.bytes);
                  result.chunks.push({
                    type: Mode.Byte,
                    bytes: byteResult.bytes,
                    text: byteResult.text
                  });
                } else if (mode === ModeByte.Kanji) {
                  var kanjiResult = decodeKanji(stream, size);
                  result.text += kanjiResult.text;
                  (_d = result.bytes).push.apply(_d, kanjiResult.bytes);
                  result.chunks.push({
                    type: Mode.Kanji,
                    bytes: kanjiResult.bytes,
                    text: kanjiResult.text
                  });
                }
              }
              if (stream.available() === 0 || stream.readBits(stream.available()) === 0) {
                return result;
              }
            }
            exports2.decode = decode;
          }),
          /* 7 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var BitStream = (
              /** @class */
              (function() {
                function BitStream2(bytes) {
                  this.byteOffset = 0;
                  this.bitOffset = 0;
                  this.bytes = bytes;
                }
                BitStream2.prototype.readBits = function(numBits) {
                  if (numBits < 1 || numBits > 32 || numBits > this.available()) {
                    throw new Error("Cannot read " + numBits.toString() + " bits");
                  }
                  var result = 0;
                  if (this.bitOffset > 0) {
                    var bitsLeft = 8 - this.bitOffset;
                    var toRead = numBits < bitsLeft ? numBits : bitsLeft;
                    var bitsToNotRead = bitsLeft - toRead;
                    var mask = 255 >> 8 - toRead << bitsToNotRead;
                    result = (this.bytes[this.byteOffset] & mask) >> bitsToNotRead;
                    numBits -= toRead;
                    this.bitOffset += toRead;
                    if (this.bitOffset === 8) {
                      this.bitOffset = 0;
                      this.byteOffset++;
                    }
                  }
                  if (numBits > 0) {
                    while (numBits >= 8) {
                      result = result << 8 | this.bytes[this.byteOffset] & 255;
                      this.byteOffset++;
                      numBits -= 8;
                    }
                    if (numBits > 0) {
                      var bitsToNotRead = 8 - numBits;
                      var mask = 255 >> bitsToNotRead << bitsToNotRead;
                      result = result << numBits | (this.bytes[this.byteOffset] & mask) >> bitsToNotRead;
                      this.bitOffset += numBits;
                    }
                  }
                  return result;
                };
                BitStream2.prototype.available = function() {
                  return 8 * (this.bytes.length - this.byteOffset) - this.bitOffset;
                };
                return BitStream2;
              })()
            );
            exports2.BitStream = BitStream;
          }),
          /* 8 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            exports2.shiftJISTable = {
              32: 32,
              33: 33,
              34: 34,
              35: 35,
              36: 36,
              37: 37,
              38: 38,
              39: 39,
              40: 40,
              41: 41,
              42: 42,
              43: 43,
              44: 44,
              45: 45,
              46: 46,
              47: 47,
              48: 48,
              49: 49,
              50: 50,
              51: 51,
              52: 52,
              53: 53,
              54: 54,
              55: 55,
              56: 56,
              57: 57,
              58: 58,
              59: 59,
              60: 60,
              61: 61,
              62: 62,
              63: 63,
              64: 64,
              65: 65,
              66: 66,
              67: 67,
              68: 68,
              69: 69,
              70: 70,
              71: 71,
              72: 72,
              73: 73,
              74: 74,
              75: 75,
              76: 76,
              77: 77,
              78: 78,
              79: 79,
              80: 80,
              81: 81,
              82: 82,
              83: 83,
              84: 84,
              85: 85,
              86: 86,
              87: 87,
              88: 88,
              89: 89,
              90: 90,
              91: 91,
              92: 165,
              93: 93,
              94: 94,
              95: 95,
              96: 96,
              97: 97,
              98: 98,
              99: 99,
              100: 100,
              101: 101,
              102: 102,
              103: 103,
              104: 104,
              105: 105,
              106: 106,
              107: 107,
              108: 108,
              109: 109,
              110: 110,
              111: 111,
              112: 112,
              113: 113,
              114: 114,
              115: 115,
              116: 116,
              117: 117,
              118: 118,
              119: 119,
              120: 120,
              121: 121,
              122: 122,
              123: 123,
              124: 124,
              125: 125,
              126: 8254,
              33088: 12288,
              33089: 12289,
              33090: 12290,
              33091: 65292,
              33092: 65294,
              33093: 12539,
              33094: 65306,
              33095: 65307,
              33096: 65311,
              33097: 65281,
              33098: 12443,
              33099: 12444,
              33100: 180,
              33101: 65344,
              33102: 168,
              33103: 65342,
              33104: 65507,
              33105: 65343,
              33106: 12541,
              33107: 12542,
              33108: 12445,
              33109: 12446,
              33110: 12291,
              33111: 20189,
              33112: 12293,
              33113: 12294,
              33114: 12295,
              33115: 12540,
              33116: 8213,
              33117: 8208,
              33118: 65295,
              33119: 92,
              33120: 12316,
              33121: 8214,
              33122: 65372,
              33123: 8230,
              33124: 8229,
              33125: 8216,
              33126: 8217,
              33127: 8220,
              33128: 8221,
              33129: 65288,
              33130: 65289,
              33131: 12308,
              33132: 12309,
              33133: 65339,
              33134: 65341,
              33135: 65371,
              33136: 65373,
              33137: 12296,
              33138: 12297,
              33139: 12298,
              33140: 12299,
              33141: 12300,
              33142: 12301,
              33143: 12302,
              33144: 12303,
              33145: 12304,
              33146: 12305,
              33147: 65291,
              33148: 8722,
              33149: 177,
              33150: 215,
              33152: 247,
              33153: 65309,
              33154: 8800,
              33155: 65308,
              33156: 65310,
              33157: 8806,
              33158: 8807,
              33159: 8734,
              33160: 8756,
              33161: 9794,
              33162: 9792,
              33163: 176,
              33164: 8242,
              33165: 8243,
              33166: 8451,
              33167: 65509,
              33168: 65284,
              33169: 162,
              33170: 163,
              33171: 65285,
              33172: 65283,
              33173: 65286,
              33174: 65290,
              33175: 65312,
              33176: 167,
              33177: 9734,
              33178: 9733,
              33179: 9675,
              33180: 9679,
              33181: 9678,
              33182: 9671,
              33183: 9670,
              33184: 9633,
              33185: 9632,
              33186: 9651,
              33187: 9650,
              33188: 9661,
              33189: 9660,
              33190: 8251,
              33191: 12306,
              33192: 8594,
              33193: 8592,
              33194: 8593,
              33195: 8595,
              33196: 12307,
              33208: 8712,
              33209: 8715,
              33210: 8838,
              33211: 8839,
              33212: 8834,
              33213: 8835,
              33214: 8746,
              33215: 8745,
              33224: 8743,
              33225: 8744,
              33226: 172,
              33227: 8658,
              33228: 8660,
              33229: 8704,
              33230: 8707,
              33242: 8736,
              33243: 8869,
              33244: 8978,
              33245: 8706,
              33246: 8711,
              33247: 8801,
              33248: 8786,
              33249: 8810,
              33250: 8811,
              33251: 8730,
              33252: 8765,
              33253: 8733,
              33254: 8757,
              33255: 8747,
              33256: 8748,
              33264: 8491,
              33265: 8240,
              33266: 9839,
              33267: 9837,
              33268: 9834,
              33269: 8224,
              33270: 8225,
              33271: 182,
              33276: 9711,
              33359: 65296,
              33360: 65297,
              33361: 65298,
              33362: 65299,
              33363: 65300,
              33364: 65301,
              33365: 65302,
              33366: 65303,
              33367: 65304,
              33368: 65305,
              33376: 65313,
              33377: 65314,
              33378: 65315,
              33379: 65316,
              33380: 65317,
              33381: 65318,
              33382: 65319,
              33383: 65320,
              33384: 65321,
              33385: 65322,
              33386: 65323,
              33387: 65324,
              33388: 65325,
              33389: 65326,
              33390: 65327,
              33391: 65328,
              33392: 65329,
              33393: 65330,
              33394: 65331,
              33395: 65332,
              33396: 65333,
              33397: 65334,
              33398: 65335,
              33399: 65336,
              33400: 65337,
              33401: 65338,
              33409: 65345,
              33410: 65346,
              33411: 65347,
              33412: 65348,
              33413: 65349,
              33414: 65350,
              33415: 65351,
              33416: 65352,
              33417: 65353,
              33418: 65354,
              33419: 65355,
              33420: 65356,
              33421: 65357,
              33422: 65358,
              33423: 65359,
              33424: 65360,
              33425: 65361,
              33426: 65362,
              33427: 65363,
              33428: 65364,
              33429: 65365,
              33430: 65366,
              33431: 65367,
              33432: 65368,
              33433: 65369,
              33434: 65370,
              33439: 12353,
              33440: 12354,
              33441: 12355,
              33442: 12356,
              33443: 12357,
              33444: 12358,
              33445: 12359,
              33446: 12360,
              33447: 12361,
              33448: 12362,
              33449: 12363,
              33450: 12364,
              33451: 12365,
              33452: 12366,
              33453: 12367,
              33454: 12368,
              33455: 12369,
              33456: 12370,
              33457: 12371,
              33458: 12372,
              33459: 12373,
              33460: 12374,
              33461: 12375,
              33462: 12376,
              33463: 12377,
              33464: 12378,
              33465: 12379,
              33466: 12380,
              33467: 12381,
              33468: 12382,
              33469: 12383,
              33470: 12384,
              33471: 12385,
              33472: 12386,
              33473: 12387,
              33474: 12388,
              33475: 12389,
              33476: 12390,
              33477: 12391,
              33478: 12392,
              33479: 12393,
              33480: 12394,
              33481: 12395,
              33482: 12396,
              33483: 12397,
              33484: 12398,
              33485: 12399,
              33486: 12400,
              33487: 12401,
              33488: 12402,
              33489: 12403,
              33490: 12404,
              33491: 12405,
              33492: 12406,
              33493: 12407,
              33494: 12408,
              33495: 12409,
              33496: 12410,
              33497: 12411,
              33498: 12412,
              33499: 12413,
              33500: 12414,
              33501: 12415,
              33502: 12416,
              33503: 12417,
              33504: 12418,
              33505: 12419,
              33506: 12420,
              33507: 12421,
              33508: 12422,
              33509: 12423,
              33510: 12424,
              33511: 12425,
              33512: 12426,
              33513: 12427,
              33514: 12428,
              33515: 12429,
              33516: 12430,
              33517: 12431,
              33518: 12432,
              33519: 12433,
              33520: 12434,
              33521: 12435,
              33600: 12449,
              33601: 12450,
              33602: 12451,
              33603: 12452,
              33604: 12453,
              33605: 12454,
              33606: 12455,
              33607: 12456,
              33608: 12457,
              33609: 12458,
              33610: 12459,
              33611: 12460,
              33612: 12461,
              33613: 12462,
              33614: 12463,
              33615: 12464,
              33616: 12465,
              33617: 12466,
              33618: 12467,
              33619: 12468,
              33620: 12469,
              33621: 12470,
              33622: 12471,
              33623: 12472,
              33624: 12473,
              33625: 12474,
              33626: 12475,
              33627: 12476,
              33628: 12477,
              33629: 12478,
              33630: 12479,
              33631: 12480,
              33632: 12481,
              33633: 12482,
              33634: 12483,
              33635: 12484,
              33636: 12485,
              33637: 12486,
              33638: 12487,
              33639: 12488,
              33640: 12489,
              33641: 12490,
              33642: 12491,
              33643: 12492,
              33644: 12493,
              33645: 12494,
              33646: 12495,
              33647: 12496,
              33648: 12497,
              33649: 12498,
              33650: 12499,
              33651: 12500,
              33652: 12501,
              33653: 12502,
              33654: 12503,
              33655: 12504,
              33656: 12505,
              33657: 12506,
              33658: 12507,
              33659: 12508,
              33660: 12509,
              33661: 12510,
              33662: 12511,
              33664: 12512,
              33665: 12513,
              33666: 12514,
              33667: 12515,
              33668: 12516,
              33669: 12517,
              33670: 12518,
              33671: 12519,
              33672: 12520,
              33673: 12521,
              33674: 12522,
              33675: 12523,
              33676: 12524,
              33677: 12525,
              33678: 12526,
              33679: 12527,
              33680: 12528,
              33681: 12529,
              33682: 12530,
              33683: 12531,
              33684: 12532,
              33685: 12533,
              33686: 12534,
              33695: 913,
              33696: 914,
              33697: 915,
              33698: 916,
              33699: 917,
              33700: 918,
              33701: 919,
              33702: 920,
              33703: 921,
              33704: 922,
              33705: 923,
              33706: 924,
              33707: 925,
              33708: 926,
              33709: 927,
              33710: 928,
              33711: 929,
              33712: 931,
              33713: 932,
              33714: 933,
              33715: 934,
              33716: 935,
              33717: 936,
              33718: 937,
              33727: 945,
              33728: 946,
              33729: 947,
              33730: 948,
              33731: 949,
              33732: 950,
              33733: 951,
              33734: 952,
              33735: 953,
              33736: 954,
              33737: 955,
              33738: 956,
              33739: 957,
              33740: 958,
              33741: 959,
              33742: 960,
              33743: 961,
              33744: 963,
              33745: 964,
              33746: 965,
              33747: 966,
              33748: 967,
              33749: 968,
              33750: 969,
              33856: 1040,
              33857: 1041,
              33858: 1042,
              33859: 1043,
              33860: 1044,
              33861: 1045,
              33862: 1025,
              33863: 1046,
              33864: 1047,
              33865: 1048,
              33866: 1049,
              33867: 1050,
              33868: 1051,
              33869: 1052,
              33870: 1053,
              33871: 1054,
              33872: 1055,
              33873: 1056,
              33874: 1057,
              33875: 1058,
              33876: 1059,
              33877: 1060,
              33878: 1061,
              33879: 1062,
              33880: 1063,
              33881: 1064,
              33882: 1065,
              33883: 1066,
              33884: 1067,
              33885: 1068,
              33886: 1069,
              33887: 1070,
              33888: 1071,
              33904: 1072,
              33905: 1073,
              33906: 1074,
              33907: 1075,
              33908: 1076,
              33909: 1077,
              33910: 1105,
              33911: 1078,
              33912: 1079,
              33913: 1080,
              33914: 1081,
              33915: 1082,
              33916: 1083,
              33917: 1084,
              33918: 1085,
              33920: 1086,
              33921: 1087,
              33922: 1088,
              33923: 1089,
              33924: 1090,
              33925: 1091,
              33926: 1092,
              33927: 1093,
              33928: 1094,
              33929: 1095,
              33930: 1096,
              33931: 1097,
              33932: 1098,
              33933: 1099,
              33934: 1100,
              33935: 1101,
              33936: 1102,
              33937: 1103,
              33951: 9472,
              33952: 9474,
              33953: 9484,
              33954: 9488,
              33955: 9496,
              33956: 9492,
              33957: 9500,
              33958: 9516,
              33959: 9508,
              33960: 9524,
              33961: 9532,
              33962: 9473,
              33963: 9475,
              33964: 9487,
              33965: 9491,
              33966: 9499,
              33967: 9495,
              33968: 9507,
              33969: 9523,
              33970: 9515,
              33971: 9531,
              33972: 9547,
              33973: 9504,
              33974: 9519,
              33975: 9512,
              33976: 9527,
              33977: 9535,
              33978: 9501,
              33979: 9520,
              33980: 9509,
              33981: 9528,
              33982: 9538,
              34975: 20124,
              34976: 21782,
              34977: 23043,
              34978: 38463,
              34979: 21696,
              34980: 24859,
              34981: 25384,
              34982: 23030,
              34983: 36898,
              34984: 33909,
              34985: 33564,
              34986: 31312,
              34987: 24746,
              34988: 25569,
              34989: 28197,
              34990: 26093,
              34991: 33894,
              34992: 33446,
              34993: 39925,
              34994: 26771,
              34995: 22311,
              34996: 26017,
              34997: 25201,
              34998: 23451,
              34999: 22992,
              35e3: 34427,
              35001: 39156,
              35002: 32098,
              35003: 32190,
              35004: 39822,
              35005: 25110,
              35006: 31903,
              35007: 34999,
              35008: 23433,
              35009: 24245,
              35010: 25353,
              35011: 26263,
              35012: 26696,
              35013: 38343,
              35014: 38797,
              35015: 26447,
              35016: 20197,
              35017: 20234,
              35018: 20301,
              35019: 20381,
              35020: 20553,
              35021: 22258,
              35022: 22839,
              35023: 22996,
              35024: 23041,
              35025: 23561,
              35026: 24799,
              35027: 24847,
              35028: 24944,
              35029: 26131,
              35030: 26885,
              35031: 28858,
              35032: 30031,
              35033: 30064,
              35034: 31227,
              35035: 32173,
              35036: 32239,
              35037: 32963,
              35038: 33806,
              35039: 34915,
              35040: 35586,
              35041: 36949,
              35042: 36986,
              35043: 21307,
              35044: 20117,
              35045: 20133,
              35046: 22495,
              35047: 32946,
              35048: 37057,
              35049: 30959,
              35050: 19968,
              35051: 22769,
              35052: 28322,
              35053: 36920,
              35054: 31282,
              35055: 33576,
              35056: 33419,
              35057: 39983,
              35058: 20801,
              35059: 21360,
              35060: 21693,
              35061: 21729,
              35062: 22240,
              35063: 23035,
              35064: 24341,
              35065: 39154,
              35066: 28139,
              35067: 32996,
              35068: 34093,
              35136: 38498,
              35137: 38512,
              35138: 38560,
              35139: 38907,
              35140: 21515,
              35141: 21491,
              35142: 23431,
              35143: 28879,
              35144: 32701,
              35145: 36802,
              35146: 38632,
              35147: 21359,
              35148: 40284,
              35149: 31418,
              35150: 19985,
              35151: 30867,
              35152: 33276,
              35153: 28198,
              35154: 22040,
              35155: 21764,
              35156: 27421,
              35157: 34074,
              35158: 39995,
              35159: 23013,
              35160: 21417,
              35161: 28006,
              35162: 29916,
              35163: 38287,
              35164: 22082,
              35165: 20113,
              35166: 36939,
              35167: 38642,
              35168: 33615,
              35169: 39180,
              35170: 21473,
              35171: 21942,
              35172: 23344,
              35173: 24433,
              35174: 26144,
              35175: 26355,
              35176: 26628,
              35177: 27704,
              35178: 27891,
              35179: 27945,
              35180: 29787,
              35181: 30408,
              35182: 31310,
              35183: 38964,
              35184: 33521,
              35185: 34907,
              35186: 35424,
              35187: 37613,
              35188: 28082,
              35189: 30123,
              35190: 30410,
              35191: 39365,
              35192: 24742,
              35193: 35585,
              35194: 36234,
              35195: 38322,
              35196: 27022,
              35197: 21421,
              35198: 20870,
              35200: 22290,
              35201: 22576,
              35202: 22852,
              35203: 23476,
              35204: 24310,
              35205: 24616,
              35206: 25513,
              35207: 25588,
              35208: 27839,
              35209: 28436,
              35210: 28814,
              35211: 28948,
              35212: 29017,
              35213: 29141,
              35214: 29503,
              35215: 32257,
              35216: 33398,
              35217: 33489,
              35218: 34199,
              35219: 36960,
              35220: 37467,
              35221: 40219,
              35222: 22633,
              35223: 26044,
              35224: 27738,
              35225: 29989,
              35226: 20985,
              35227: 22830,
              35228: 22885,
              35229: 24448,
              35230: 24540,
              35231: 25276,
              35232: 26106,
              35233: 27178,
              35234: 27431,
              35235: 27572,
              35236: 29579,
              35237: 32705,
              35238: 35158,
              35239: 40236,
              35240: 40206,
              35241: 40644,
              35242: 23713,
              35243: 27798,
              35244: 33659,
              35245: 20740,
              35246: 23627,
              35247: 25014,
              35248: 33222,
              35249: 26742,
              35250: 29281,
              35251: 20057,
              35252: 20474,
              35253: 21368,
              35254: 24681,
              35255: 28201,
              35256: 31311,
              35257: 38899,
              35258: 19979,
              35259: 21270,
              35260: 20206,
              35261: 20309,
              35262: 20285,
              35263: 20385,
              35264: 20339,
              35265: 21152,
              35266: 21487,
              35267: 22025,
              35268: 22799,
              35269: 23233,
              35270: 23478,
              35271: 23521,
              35272: 31185,
              35273: 26247,
              35274: 26524,
              35275: 26550,
              35276: 27468,
              35277: 27827,
              35278: 28779,
              35279: 29634,
              35280: 31117,
              35281: 31166,
              35282: 31292,
              35283: 31623,
              35284: 33457,
              35285: 33499,
              35286: 33540,
              35287: 33655,
              35288: 33775,
              35289: 33747,
              35290: 34662,
              35291: 35506,
              35292: 22057,
              35293: 36008,
              35294: 36838,
              35295: 36942,
              35296: 38686,
              35297: 34442,
              35298: 20420,
              35299: 23784,
              35300: 25105,
              35301: 29273,
              35302: 30011,
              35303: 33253,
              35304: 33469,
              35305: 34558,
              35306: 36032,
              35307: 38597,
              35308: 39187,
              35309: 39381,
              35310: 20171,
              35311: 20250,
              35312: 35299,
              35313: 22238,
              35314: 22602,
              35315: 22730,
              35316: 24315,
              35317: 24555,
              35318: 24618,
              35319: 24724,
              35320: 24674,
              35321: 25040,
              35322: 25106,
              35323: 25296,
              35324: 25913,
              35392: 39745,
              35393: 26214,
              35394: 26800,
              35395: 28023,
              35396: 28784,
              35397: 30028,
              35398: 30342,
              35399: 32117,
              35400: 33445,
              35401: 34809,
              35402: 38283,
              35403: 38542,
              35404: 35997,
              35405: 20977,
              35406: 21182,
              35407: 22806,
              35408: 21683,
              35409: 23475,
              35410: 23830,
              35411: 24936,
              35412: 27010,
              35413: 28079,
              35414: 30861,
              35415: 33995,
              35416: 34903,
              35417: 35442,
              35418: 37799,
              35419: 39608,
              35420: 28012,
              35421: 39336,
              35422: 34521,
              35423: 22435,
              35424: 26623,
              35425: 34510,
              35426: 37390,
              35427: 21123,
              35428: 22151,
              35429: 21508,
              35430: 24275,
              35431: 25313,
              35432: 25785,
              35433: 26684,
              35434: 26680,
              35435: 27579,
              35436: 29554,
              35437: 30906,
              35438: 31339,
              35439: 35226,
              35440: 35282,
              35441: 36203,
              35442: 36611,
              35443: 37101,
              35444: 38307,
              35445: 38548,
              35446: 38761,
              35447: 23398,
              35448: 23731,
              35449: 27005,
              35450: 38989,
              35451: 38990,
              35452: 25499,
              35453: 31520,
              35454: 27179,
              35456: 27263,
              35457: 26806,
              35458: 39949,
              35459: 28511,
              35460: 21106,
              35461: 21917,
              35462: 24688,
              35463: 25324,
              35464: 27963,
              35465: 28167,
              35466: 28369,
              35467: 33883,
              35468: 35088,
              35469: 36676,
              35470: 19988,
              35471: 39993,
              35472: 21494,
              35473: 26907,
              35474: 27194,
              35475: 38788,
              35476: 26666,
              35477: 20828,
              35478: 31427,
              35479: 33970,
              35480: 37340,
              35481: 37772,
              35482: 22107,
              35483: 40232,
              35484: 26658,
              35485: 33541,
              35486: 33841,
              35487: 31909,
              35488: 21e3,
              35489: 33477,
              35490: 29926,
              35491: 20094,
              35492: 20355,
              35493: 20896,
              35494: 23506,
              35495: 21002,
              35496: 21208,
              35497: 21223,
              35498: 24059,
              35499: 21914,
              35500: 22570,
              35501: 23014,
              35502: 23436,
              35503: 23448,
              35504: 23515,
              35505: 24178,
              35506: 24185,
              35507: 24739,
              35508: 24863,
              35509: 24931,
              35510: 25022,
              35511: 25563,
              35512: 25954,
              35513: 26577,
              35514: 26707,
              35515: 26874,
              35516: 27454,
              35517: 27475,
              35518: 27735,
              35519: 28450,
              35520: 28567,
              35521: 28485,
              35522: 29872,
              35523: 29976,
              35524: 30435,
              35525: 30475,
              35526: 31487,
              35527: 31649,
              35528: 31777,
              35529: 32233,
              35530: 32566,
              35531: 32752,
              35532: 32925,
              35533: 33382,
              35534: 33694,
              35535: 35251,
              35536: 35532,
              35537: 36011,
              35538: 36996,
              35539: 37969,
              35540: 38291,
              35541: 38289,
              35542: 38306,
              35543: 38501,
              35544: 38867,
              35545: 39208,
              35546: 33304,
              35547: 20024,
              35548: 21547,
              35549: 23736,
              35550: 24012,
              35551: 29609,
              35552: 30284,
              35553: 30524,
              35554: 23721,
              35555: 32747,
              35556: 36107,
              35557: 38593,
              35558: 38929,
              35559: 38996,
              35560: 39e3,
              35561: 20225,
              35562: 20238,
              35563: 21361,
              35564: 21916,
              35565: 22120,
              35566: 22522,
              35567: 22855,
              35568: 23305,
              35569: 23492,
              35570: 23696,
              35571: 24076,
              35572: 24190,
              35573: 24524,
              35574: 25582,
              35575: 26426,
              35576: 26071,
              35577: 26082,
              35578: 26399,
              35579: 26827,
              35580: 26820,
              35648: 27231,
              35649: 24112,
              35650: 27589,
              35651: 27671,
              35652: 27773,
              35653: 30079,
              35654: 31048,
              35655: 23395,
              35656: 31232,
              35657: 32e3,
              35658: 24509,
              35659: 35215,
              35660: 35352,
              35661: 36020,
              35662: 36215,
              35663: 36556,
              35664: 36637,
              35665: 39138,
              35666: 39438,
              35667: 39740,
              35668: 20096,
              35669: 20605,
              35670: 20736,
              35671: 22931,
              35672: 23452,
              35673: 25135,
              35674: 25216,
              35675: 25836,
              35676: 27450,
              35677: 29344,
              35678: 30097,
              35679: 31047,
              35680: 32681,
              35681: 34811,
              35682: 35516,
              35683: 35696,
              35684: 25516,
              35685: 33738,
              35686: 38816,
              35687: 21513,
              35688: 21507,
              35689: 21931,
              35690: 26708,
              35691: 27224,
              35692: 35440,
              35693: 30759,
              35694: 26485,
              35695: 40653,
              35696: 21364,
              35697: 23458,
              35698: 33050,
              35699: 34384,
              35700: 36870,
              35701: 19992,
              35702: 20037,
              35703: 20167,
              35704: 20241,
              35705: 21450,
              35706: 21560,
              35707: 23470,
              35708: 24339,
              35709: 24613,
              35710: 25937,
              35712: 26429,
              35713: 27714,
              35714: 27762,
              35715: 27875,
              35716: 28792,
              35717: 29699,
              35718: 31350,
              35719: 31406,
              35720: 31496,
              35721: 32026,
              35722: 31998,
              35723: 32102,
              35724: 26087,
              35725: 29275,
              35726: 21435,
              35727: 23621,
              35728: 24040,
              35729: 25298,
              35730: 25312,
              35731: 25369,
              35732: 28192,
              35733: 34394,
              35734: 35377,
              35735: 36317,
              35736: 37624,
              35737: 28417,
              35738: 31142,
              35739: 39770,
              35740: 20136,
              35741: 20139,
              35742: 20140,
              35743: 20379,
              35744: 20384,
              35745: 20689,
              35746: 20807,
              35747: 31478,
              35748: 20849,
              35749: 20982,
              35750: 21332,
              35751: 21281,
              35752: 21375,
              35753: 21483,
              35754: 21932,
              35755: 22659,
              35756: 23777,
              35757: 24375,
              35758: 24394,
              35759: 24623,
              35760: 24656,
              35761: 24685,
              35762: 25375,
              35763: 25945,
              35764: 27211,
              35765: 27841,
              35766: 29378,
              35767: 29421,
              35768: 30703,
              35769: 33016,
              35770: 33029,
              35771: 33288,
              35772: 34126,
              35773: 37111,
              35774: 37857,
              35775: 38911,
              35776: 39255,
              35777: 39514,
              35778: 20208,
              35779: 20957,
              35780: 23597,
              35781: 26241,
              35782: 26989,
              35783: 23616,
              35784: 26354,
              35785: 26997,
              35786: 29577,
              35787: 26704,
              35788: 31873,
              35789: 20677,
              35790: 21220,
              35791: 22343,
              35792: 24062,
              35793: 37670,
              35794: 26020,
              35795: 27427,
              35796: 27453,
              35797: 29748,
              35798: 31105,
              35799: 31165,
              35800: 31563,
              35801: 32202,
              35802: 33465,
              35803: 33740,
              35804: 34943,
              35805: 35167,
              35806: 35641,
              35807: 36817,
              35808: 37329,
              35809: 21535,
              35810: 37504,
              35811: 20061,
              35812: 20534,
              35813: 21477,
              35814: 21306,
              35815: 29399,
              35816: 29590,
              35817: 30697,
              35818: 33510,
              35819: 36527,
              35820: 39366,
              35821: 39368,
              35822: 39378,
              35823: 20855,
              35824: 24858,
              35825: 34398,
              35826: 21936,
              35827: 31354,
              35828: 20598,
              35829: 23507,
              35830: 36935,
              35831: 38533,
              35832: 20018,
              35833: 27355,
              35834: 37351,
              35835: 23633,
              35836: 23624,
              35904: 25496,
              35905: 31391,
              35906: 27795,
              35907: 38772,
              35908: 36705,
              35909: 31402,
              35910: 29066,
              35911: 38536,
              35912: 31874,
              35913: 26647,
              35914: 32368,
              35915: 26705,
              35916: 37740,
              35917: 21234,
              35918: 21531,
              35919: 34219,
              35920: 35347,
              35921: 32676,
              35922: 36557,
              35923: 37089,
              35924: 21350,
              35925: 34952,
              35926: 31041,
              35927: 20418,
              35928: 20670,
              35929: 21009,
              35930: 20804,
              35931: 21843,
              35932: 22317,
              35933: 29674,
              35934: 22411,
              35935: 22865,
              35936: 24418,
              35937: 24452,
              35938: 24693,
              35939: 24950,
              35940: 24935,
              35941: 25001,
              35942: 25522,
              35943: 25658,
              35944: 25964,
              35945: 26223,
              35946: 26690,
              35947: 28179,
              35948: 30054,
              35949: 31293,
              35950: 31995,
              35951: 32076,
              35952: 32153,
              35953: 32331,
              35954: 32619,
              35955: 33550,
              35956: 33610,
              35957: 34509,
              35958: 35336,
              35959: 35427,
              35960: 35686,
              35961: 36605,
              35962: 38938,
              35963: 40335,
              35964: 33464,
              35965: 36814,
              35966: 39912,
              35968: 21127,
              35969: 25119,
              35970: 25731,
              35971: 28608,
              35972: 38553,
              35973: 26689,
              35974: 20625,
              35975: 27424,
              35976: 27770,
              35977: 28500,
              35978: 31348,
              35979: 32080,
              35980: 34880,
              35981: 35363,
              35982: 26376,
              35983: 20214,
              35984: 20537,
              35985: 20518,
              35986: 20581,
              35987: 20860,
              35988: 21048,
              35989: 21091,
              35990: 21927,
              35991: 22287,
              35992: 22533,
              35993: 23244,
              35994: 24314,
              35995: 25010,
              35996: 25080,
              35997: 25331,
              35998: 25458,
              35999: 26908,
              36e3: 27177,
              36001: 29309,
              36002: 29356,
              36003: 29486,
              36004: 30740,
              36005: 30831,
              36006: 32121,
              36007: 30476,
              36008: 32937,
              36009: 35211,
              36010: 35609,
              36011: 36066,
              36012: 36562,
              36013: 36963,
              36014: 37749,
              36015: 38522,
              36016: 38997,
              36017: 39443,
              36018: 40568,
              36019: 20803,
              36020: 21407,
              36021: 21427,
              36022: 24187,
              36023: 24358,
              36024: 28187,
              36025: 28304,
              36026: 29572,
              36027: 29694,
              36028: 32067,
              36029: 33335,
              36030: 35328,
              36031: 35578,
              36032: 38480,
              36033: 20046,
              36034: 20491,
              36035: 21476,
              36036: 21628,
              36037: 22266,
              36038: 22993,
              36039: 23396,
              36040: 24049,
              36041: 24235,
              36042: 24359,
              36043: 25144,
              36044: 25925,
              36045: 26543,
              36046: 28246,
              36047: 29392,
              36048: 31946,
              36049: 34996,
              36050: 32929,
              36051: 32993,
              36052: 33776,
              36053: 34382,
              36054: 35463,
              36055: 36328,
              36056: 37431,
              36057: 38599,
              36058: 39015,
              36059: 40723,
              36060: 20116,
              36061: 20114,
              36062: 20237,
              36063: 21320,
              36064: 21577,
              36065: 21566,
              36066: 23087,
              36067: 24460,
              36068: 24481,
              36069: 24735,
              36070: 26791,
              36071: 27278,
              36072: 29786,
              36073: 30849,
              36074: 35486,
              36075: 35492,
              36076: 35703,
              36077: 37264,
              36078: 20062,
              36079: 39881,
              36080: 20132,
              36081: 20348,
              36082: 20399,
              36083: 20505,
              36084: 20502,
              36085: 20809,
              36086: 20844,
              36087: 21151,
              36088: 21177,
              36089: 21246,
              36090: 21402,
              36091: 21475,
              36092: 21521,
              36160: 21518,
              36161: 21897,
              36162: 22353,
              36163: 22434,
              36164: 22909,
              36165: 23380,
              36166: 23389,
              36167: 23439,
              36168: 24037,
              36169: 24039,
              36170: 24055,
              36171: 24184,
              36172: 24195,
              36173: 24218,
              36174: 24247,
              36175: 24344,
              36176: 24658,
              36177: 24908,
              36178: 25239,
              36179: 25304,
              36180: 25511,
              36181: 25915,
              36182: 26114,
              36183: 26179,
              36184: 26356,
              36185: 26477,
              36186: 26657,
              36187: 26775,
              36188: 27083,
              36189: 27743,
              36190: 27946,
              36191: 28009,
              36192: 28207,
              36193: 28317,
              36194: 30002,
              36195: 30343,
              36196: 30828,
              36197: 31295,
              36198: 31968,
              36199: 32005,
              36200: 32024,
              36201: 32094,
              36202: 32177,
              36203: 32789,
              36204: 32771,
              36205: 32943,
              36206: 32945,
              36207: 33108,
              36208: 33167,
              36209: 33322,
              36210: 33618,
              36211: 34892,
              36212: 34913,
              36213: 35611,
              36214: 36002,
              36215: 36092,
              36216: 37066,
              36217: 37237,
              36218: 37489,
              36219: 30783,
              36220: 37628,
              36221: 38308,
              36222: 38477,
              36224: 38917,
              36225: 39321,
              36226: 39640,
              36227: 40251,
              36228: 21083,
              36229: 21163,
              36230: 21495,
              36231: 21512,
              36232: 22741,
              36233: 25335,
              36234: 28640,
              36235: 35946,
              36236: 36703,
              36237: 40633,
              36238: 20811,
              36239: 21051,
              36240: 21578,
              36241: 22269,
              36242: 31296,
              36243: 37239,
              36244: 40288,
              36245: 40658,
              36246: 29508,
              36247: 28425,
              36248: 33136,
              36249: 29969,
              36250: 24573,
              36251: 24794,
              36252: 39592,
              36253: 29403,
              36254: 36796,
              36255: 27492,
              36256: 38915,
              36257: 20170,
              36258: 22256,
              36259: 22372,
              36260: 22718,
              36261: 23130,
              36262: 24680,
              36263: 25031,
              36264: 26127,
              36265: 26118,
              36266: 26681,
              36267: 26801,
              36268: 28151,
              36269: 30165,
              36270: 32058,
              36271: 33390,
              36272: 39746,
              36273: 20123,
              36274: 20304,
              36275: 21449,
              36276: 21766,
              36277: 23919,
              36278: 24038,
              36279: 24046,
              36280: 26619,
              36281: 27801,
              36282: 29811,
              36283: 30722,
              36284: 35408,
              36285: 37782,
              36286: 35039,
              36287: 22352,
              36288: 24231,
              36289: 25387,
              36290: 20661,
              36291: 20652,
              36292: 20877,
              36293: 26368,
              36294: 21705,
              36295: 22622,
              36296: 22971,
              36297: 23472,
              36298: 24425,
              36299: 25165,
              36300: 25505,
              36301: 26685,
              36302: 27507,
              36303: 28168,
              36304: 28797,
              36305: 37319,
              36306: 29312,
              36307: 30741,
              36308: 30758,
              36309: 31085,
              36310: 25998,
              36311: 32048,
              36312: 33756,
              36313: 35009,
              36314: 36617,
              36315: 38555,
              36316: 21092,
              36317: 22312,
              36318: 26448,
              36319: 32618,
              36320: 36001,
              36321: 20916,
              36322: 22338,
              36323: 38442,
              36324: 22586,
              36325: 27018,
              36326: 32948,
              36327: 21682,
              36328: 23822,
              36329: 22524,
              36330: 30869,
              36331: 40442,
              36332: 20316,
              36333: 21066,
              36334: 21643,
              36335: 25662,
              36336: 26152,
              36337: 26388,
              36338: 26613,
              36339: 31364,
              36340: 31574,
              36341: 32034,
              36342: 37679,
              36343: 26716,
              36344: 39853,
              36345: 31545,
              36346: 21273,
              36347: 20874,
              36348: 21047,
              36416: 23519,
              36417: 25334,
              36418: 25774,
              36419: 25830,
              36420: 26413,
              36421: 27578,
              36422: 34217,
              36423: 38609,
              36424: 30352,
              36425: 39894,
              36426: 25420,
              36427: 37638,
              36428: 39851,
              36429: 30399,
              36430: 26194,
              36431: 19977,
              36432: 20632,
              36433: 21442,
              36434: 23665,
              36435: 24808,
              36436: 25746,
              36437: 25955,
              36438: 26719,
              36439: 29158,
              36440: 29642,
              36441: 29987,
              36442: 31639,
              36443: 32386,
              36444: 34453,
              36445: 35715,
              36446: 36059,
              36447: 37240,
              36448: 39184,
              36449: 26028,
              36450: 26283,
              36451: 27531,
              36452: 20181,
              36453: 20180,
              36454: 20282,
              36455: 20351,
              36456: 21050,
              36457: 21496,
              36458: 21490,
              36459: 21987,
              36460: 22235,
              36461: 22763,
              36462: 22987,
              36463: 22985,
              36464: 23039,
              36465: 23376,
              36466: 23629,
              36467: 24066,
              36468: 24107,
              36469: 24535,
              36470: 24605,
              36471: 25351,
              36472: 25903,
              36473: 23388,
              36474: 26031,
              36475: 26045,
              36476: 26088,
              36477: 26525,
              36478: 27490,
              36480: 27515,
              36481: 27663,
              36482: 29509,
              36483: 31049,
              36484: 31169,
              36485: 31992,
              36486: 32025,
              36487: 32043,
              36488: 32930,
              36489: 33026,
              36490: 33267,
              36491: 35222,
              36492: 35422,
              36493: 35433,
              36494: 35430,
              36495: 35468,
              36496: 35566,
              36497: 36039,
              36498: 36060,
              36499: 38604,
              36500: 39164,
              36501: 27503,
              36502: 20107,
              36503: 20284,
              36504: 20365,
              36505: 20816,
              36506: 23383,
              36507: 23546,
              36508: 24904,
              36509: 25345,
              36510: 26178,
              36511: 27425,
              36512: 28363,
              36513: 27835,
              36514: 29246,
              36515: 29885,
              36516: 30164,
              36517: 30913,
              36518: 31034,
              36519: 32780,
              36520: 32819,
              36521: 33258,
              36522: 33940,
              36523: 36766,
              36524: 27728,
              36525: 40575,
              36526: 24335,
              36527: 35672,
              36528: 40235,
              36529: 31482,
              36530: 36600,
              36531: 23437,
              36532: 38635,
              36533: 19971,
              36534: 21489,
              36535: 22519,
              36536: 22833,
              36537: 23241,
              36538: 23460,
              36539: 24713,
              36540: 28287,
              36541: 28422,
              36542: 30142,
              36543: 36074,
              36544: 23455,
              36545: 34048,
              36546: 31712,
              36547: 20594,
              36548: 26612,
              36549: 33437,
              36550: 23649,
              36551: 34122,
              36552: 32286,
              36553: 33294,
              36554: 20889,
              36555: 23556,
              36556: 25448,
              36557: 36198,
              36558: 26012,
              36559: 29038,
              36560: 31038,
              36561: 32023,
              36562: 32773,
              36563: 35613,
              36564: 36554,
              36565: 36974,
              36566: 34503,
              36567: 37034,
              36568: 20511,
              36569: 21242,
              36570: 23610,
              36571: 26451,
              36572: 28796,
              36573: 29237,
              36574: 37196,
              36575: 37320,
              36576: 37675,
              36577: 33509,
              36578: 23490,
              36579: 24369,
              36580: 24825,
              36581: 20027,
              36582: 21462,
              36583: 23432,
              36584: 25163,
              36585: 26417,
              36586: 27530,
              36587: 29417,
              36588: 29664,
              36589: 31278,
              36590: 33131,
              36591: 36259,
              36592: 37202,
              36593: 39318,
              36594: 20754,
              36595: 21463,
              36596: 21610,
              36597: 23551,
              36598: 25480,
              36599: 27193,
              36600: 32172,
              36601: 38656,
              36602: 22234,
              36603: 21454,
              36604: 21608,
              36672: 23447,
              36673: 23601,
              36674: 24030,
              36675: 20462,
              36676: 24833,
              36677: 25342,
              36678: 27954,
              36679: 31168,
              36680: 31179,
              36681: 32066,
              36682: 32333,
              36683: 32722,
              36684: 33261,
              36685: 33311,
              36686: 33936,
              36687: 34886,
              36688: 35186,
              36689: 35728,
              36690: 36468,
              36691: 36655,
              36692: 36913,
              36693: 37195,
              36694: 37228,
              36695: 38598,
              36696: 37276,
              36697: 20160,
              36698: 20303,
              36699: 20805,
              36700: 21313,
              36701: 24467,
              36702: 25102,
              36703: 26580,
              36704: 27713,
              36705: 28171,
              36706: 29539,
              36707: 32294,
              36708: 37325,
              36709: 37507,
              36710: 21460,
              36711: 22809,
              36712: 23487,
              36713: 28113,
              36714: 31069,
              36715: 32302,
              36716: 31899,
              36717: 22654,
              36718: 29087,
              36719: 20986,
              36720: 34899,
              36721: 36848,
              36722: 20426,
              36723: 23803,
              36724: 26149,
              36725: 30636,
              36726: 31459,
              36727: 33308,
              36728: 39423,
              36729: 20934,
              36730: 24490,
              36731: 26092,
              36732: 26991,
              36733: 27529,
              36734: 28147,
              36736: 28310,
              36737: 28516,
              36738: 30462,
              36739: 32020,
              36740: 24033,
              36741: 36981,
              36742: 37255,
              36743: 38918,
              36744: 20966,
              36745: 21021,
              36746: 25152,
              36747: 26257,
              36748: 26329,
              36749: 28186,
              36750: 24246,
              36751: 32210,
              36752: 32626,
              36753: 26360,
              36754: 34223,
              36755: 34295,
              36756: 35576,
              36757: 21161,
              36758: 21465,
              36759: 22899,
              36760: 24207,
              36761: 24464,
              36762: 24661,
              36763: 37604,
              36764: 38500,
              36765: 20663,
              36766: 20767,
              36767: 21213,
              36768: 21280,
              36769: 21319,
              36770: 21484,
              36771: 21736,
              36772: 21830,
              36773: 21809,
              36774: 22039,
              36775: 22888,
              36776: 22974,
              36777: 23100,
              36778: 23477,
              36779: 23558,
              36780: 23567,
              36781: 23569,
              36782: 23578,
              36783: 24196,
              36784: 24202,
              36785: 24288,
              36786: 24432,
              36787: 25215,
              36788: 25220,
              36789: 25307,
              36790: 25484,
              36791: 25463,
              36792: 26119,
              36793: 26124,
              36794: 26157,
              36795: 26230,
              36796: 26494,
              36797: 26786,
              36798: 27167,
              36799: 27189,
              36800: 27836,
              36801: 28040,
              36802: 28169,
              36803: 28248,
              36804: 28988,
              36805: 28966,
              36806: 29031,
              36807: 30151,
              36808: 30465,
              36809: 30813,
              36810: 30977,
              36811: 31077,
              36812: 31216,
              36813: 31456,
              36814: 31505,
              36815: 31911,
              36816: 32057,
              36817: 32918,
              36818: 33750,
              36819: 33931,
              36820: 34121,
              36821: 34909,
              36822: 35059,
              36823: 35359,
              36824: 35388,
              36825: 35412,
              36826: 35443,
              36827: 35937,
              36828: 36062,
              36829: 37284,
              36830: 37478,
              36831: 37758,
              36832: 37912,
              36833: 38556,
              36834: 38808,
              36835: 19978,
              36836: 19976,
              36837: 19998,
              36838: 20055,
              36839: 20887,
              36840: 21104,
              36841: 22478,
              36842: 22580,
              36843: 22732,
              36844: 23330,
              36845: 24120,
              36846: 24773,
              36847: 25854,
              36848: 26465,
              36849: 26454,
              36850: 27972,
              36851: 29366,
              36852: 30067,
              36853: 31331,
              36854: 33976,
              36855: 35698,
              36856: 37304,
              36857: 37664,
              36858: 22065,
              36859: 22516,
              36860: 39166,
              36928: 25325,
              36929: 26893,
              36930: 27542,
              36931: 29165,
              36932: 32340,
              36933: 32887,
              36934: 33394,
              36935: 35302,
              36936: 39135,
              36937: 34645,
              36938: 36785,
              36939: 23611,
              36940: 20280,
              36941: 20449,
              36942: 20405,
              36943: 21767,
              36944: 23072,
              36945: 23517,
              36946: 23529,
              36947: 24515,
              36948: 24910,
              36949: 25391,
              36950: 26032,
              36951: 26187,
              36952: 26862,
              36953: 27035,
              36954: 28024,
              36955: 28145,
              36956: 30003,
              36957: 30137,
              36958: 30495,
              36959: 31070,
              36960: 31206,
              36961: 32051,
              36962: 33251,
              36963: 33455,
              36964: 34218,
              36965: 35242,
              36966: 35386,
              36967: 36523,
              36968: 36763,
              36969: 36914,
              36970: 37341,
              36971: 38663,
              36972: 20154,
              36973: 20161,
              36974: 20995,
              36975: 22645,
              36976: 22764,
              36977: 23563,
              36978: 29978,
              36979: 23613,
              36980: 33102,
              36981: 35338,
              36982: 36805,
              36983: 38499,
              36984: 38765,
              36985: 31525,
              36986: 35535,
              36987: 38920,
              36988: 37218,
              36989: 22259,
              36990: 21416,
              36992: 36887,
              36993: 21561,
              36994: 22402,
              36995: 24101,
              36996: 25512,
              36997: 27700,
              36998: 28810,
              36999: 30561,
              37e3: 31883,
              37001: 32736,
              37002: 34928,
              37003: 36930,
              37004: 37204,
              37005: 37648,
              37006: 37656,
              37007: 38543,
              37008: 29790,
              37009: 39620,
              37010: 23815,
              37011: 23913,
              37012: 25968,
              37013: 26530,
              37014: 36264,
              37015: 38619,
              37016: 25454,
              37017: 26441,
              37018: 26905,
              37019: 33733,
              37020: 38935,
              37021: 38592,
              37022: 35070,
              37023: 28548,
              37024: 25722,
              37025: 23544,
              37026: 19990,
              37027: 28716,
              37028: 30045,
              37029: 26159,
              37030: 20932,
              37031: 21046,
              37032: 21218,
              37033: 22995,
              37034: 24449,
              37035: 24615,
              37036: 25104,
              37037: 25919,
              37038: 25972,
              37039: 26143,
              37040: 26228,
              37041: 26866,
              37042: 26646,
              37043: 27491,
              37044: 28165,
              37045: 29298,
              37046: 29983,
              37047: 30427,
              37048: 31934,
              37049: 32854,
              37050: 22768,
              37051: 35069,
              37052: 35199,
              37053: 35488,
              37054: 35475,
              37055: 35531,
              37056: 36893,
              37057: 37266,
              37058: 38738,
              37059: 38745,
              37060: 25993,
              37061: 31246,
              37062: 33030,
              37063: 38587,
              37064: 24109,
              37065: 24796,
              37066: 25114,
              37067: 26021,
              37068: 26132,
              37069: 26512,
              37070: 30707,
              37071: 31309,
              37072: 31821,
              37073: 32318,
              37074: 33034,
              37075: 36012,
              37076: 36196,
              37077: 36321,
              37078: 36447,
              37079: 30889,
              37080: 20999,
              37081: 25305,
              37082: 25509,
              37083: 25666,
              37084: 25240,
              37085: 35373,
              37086: 31363,
              37087: 31680,
              37088: 35500,
              37089: 38634,
              37090: 32118,
              37091: 33292,
              37092: 34633,
              37093: 20185,
              37094: 20808,
              37095: 21315,
              37096: 21344,
              37097: 23459,
              37098: 23554,
              37099: 23574,
              37100: 24029,
              37101: 25126,
              37102: 25159,
              37103: 25776,
              37104: 26643,
              37105: 26676,
              37106: 27849,
              37107: 27973,
              37108: 27927,
              37109: 26579,
              37110: 28508,
              37111: 29006,
              37112: 29053,
              37113: 26059,
              37114: 31359,
              37115: 31661,
              37116: 32218,
              37184: 32330,
              37185: 32680,
              37186: 33146,
              37187: 33307,
              37188: 33337,
              37189: 34214,
              37190: 35438,
              37191: 36046,
              37192: 36341,
              37193: 36984,
              37194: 36983,
              37195: 37549,
              37196: 37521,
              37197: 38275,
              37198: 39854,
              37199: 21069,
              37200: 21892,
              37201: 28472,
              37202: 28982,
              37203: 20840,
              37204: 31109,
              37205: 32341,
              37206: 33203,
              37207: 31950,
              37208: 22092,
              37209: 22609,
              37210: 23720,
              37211: 25514,
              37212: 26366,
              37213: 26365,
              37214: 26970,
              37215: 29401,
              37216: 30095,
              37217: 30094,
              37218: 30990,
              37219: 31062,
              37220: 31199,
              37221: 31895,
              37222: 32032,
              37223: 32068,
              37224: 34311,
              37225: 35380,
              37226: 38459,
              37227: 36961,
              37228: 40736,
              37229: 20711,
              37230: 21109,
              37231: 21452,
              37232: 21474,
              37233: 20489,
              37234: 21930,
              37235: 22766,
              37236: 22863,
              37237: 29245,
              37238: 23435,
              37239: 23652,
              37240: 21277,
              37241: 24803,
              37242: 24819,
              37243: 25436,
              37244: 25475,
              37245: 25407,
              37246: 25531,
              37248: 25805,
              37249: 26089,
              37250: 26361,
              37251: 24035,
              37252: 27085,
              37253: 27133,
              37254: 28437,
              37255: 29157,
              37256: 20105,
              37257: 30185,
              37258: 30456,
              37259: 31379,
              37260: 31967,
              37261: 32207,
              37262: 32156,
              37263: 32865,
              37264: 33609,
              37265: 33624,
              37266: 33900,
              37267: 33980,
              37268: 34299,
              37269: 35013,
              37270: 36208,
              37271: 36865,
              37272: 36973,
              37273: 37783,
              37274: 38684,
              37275: 39442,
              37276: 20687,
              37277: 22679,
              37278: 24974,
              37279: 33235,
              37280: 34101,
              37281: 36104,
              37282: 36896,
              37283: 20419,
              37284: 20596,
              37285: 21063,
              37286: 21363,
              37287: 24687,
              37288: 25417,
              37289: 26463,
              37290: 28204,
              37291: 36275,
              37292: 36895,
              37293: 20439,
              37294: 23646,
              37295: 36042,
              37296: 26063,
              37297: 32154,
              37298: 21330,
              37299: 34966,
              37300: 20854,
              37301: 25539,
              37302: 23384,
              37303: 23403,
              37304: 23562,
              37305: 25613,
              37306: 26449,
              37307: 36956,
              37308: 20182,
              37309: 22810,
              37310: 22826,
              37311: 27760,
              37312: 35409,
              37313: 21822,
              37314: 22549,
              37315: 22949,
              37316: 24816,
              37317: 25171,
              37318: 26561,
              37319: 33333,
              37320: 26965,
              37321: 38464,
              37322: 39364,
              37323: 39464,
              37324: 20307,
              37325: 22534,
              37326: 23550,
              37327: 32784,
              37328: 23729,
              37329: 24111,
              37330: 24453,
              37331: 24608,
              37332: 24907,
              37333: 25140,
              37334: 26367,
              37335: 27888,
              37336: 28382,
              37337: 32974,
              37338: 33151,
              37339: 33492,
              37340: 34955,
              37341: 36024,
              37342: 36864,
              37343: 36910,
              37344: 38538,
              37345: 40667,
              37346: 39899,
              37347: 20195,
              37348: 21488,
              37349: 22823,
              37350: 31532,
              37351: 37261,
              37352: 38988,
              37353: 40441,
              37354: 28381,
              37355: 28711,
              37356: 21331,
              37357: 21828,
              37358: 23429,
              37359: 25176,
              37360: 25246,
              37361: 25299,
              37362: 27810,
              37363: 28655,
              37364: 29730,
              37365: 35351,
              37366: 37944,
              37367: 28609,
              37368: 35582,
              37369: 33592,
              37370: 20967,
              37371: 34552,
              37372: 21482,
              37440: 21481,
              37441: 20294,
              37442: 36948,
              37443: 36784,
              37444: 22890,
              37445: 33073,
              37446: 24061,
              37447: 31466,
              37448: 36799,
              37449: 26842,
              37450: 35895,
              37451: 29432,
              37452: 40008,
              37453: 27197,
              37454: 35504,
              37455: 20025,
              37456: 21336,
              37457: 22022,
              37458: 22374,
              37459: 25285,
              37460: 25506,
              37461: 26086,
              37462: 27470,
              37463: 28129,
              37464: 28251,
              37465: 28845,
              37466: 30701,
              37467: 31471,
              37468: 31658,
              37469: 32187,
              37470: 32829,
              37471: 32966,
              37472: 34507,
              37473: 35477,
              37474: 37723,
              37475: 22243,
              37476: 22727,
              37477: 24382,
              37478: 26029,
              37479: 26262,
              37480: 27264,
              37481: 27573,
              37482: 30007,
              37483: 35527,
              37484: 20516,
              37485: 30693,
              37486: 22320,
              37487: 24347,
              37488: 24677,
              37489: 26234,
              37490: 27744,
              37491: 30196,
              37492: 31258,
              37493: 32622,
              37494: 33268,
              37495: 34584,
              37496: 36933,
              37497: 39347,
              37498: 31689,
              37499: 30044,
              37500: 31481,
              37501: 31569,
              37502: 33988,
              37504: 36880,
              37505: 31209,
              37506: 31378,
              37507: 33590,
              37508: 23265,
              37509: 30528,
              37510: 20013,
              37511: 20210,
              37512: 23449,
              37513: 24544,
              37514: 25277,
              37515: 26172,
              37516: 26609,
              37517: 27880,
              37518: 34411,
              37519: 34935,
              37520: 35387,
              37521: 37198,
              37522: 37619,
              37523: 39376,
              37524: 27159,
              37525: 28710,
              37526: 29482,
              37527: 33511,
              37528: 33879,
              37529: 36015,
              37530: 19969,
              37531: 20806,
              37532: 20939,
              37533: 21899,
              37534: 23541,
              37535: 24086,
              37536: 24115,
              37537: 24193,
              37538: 24340,
              37539: 24373,
              37540: 24427,
              37541: 24500,
              37542: 25074,
              37543: 25361,
              37544: 26274,
              37545: 26397,
              37546: 28526,
              37547: 29266,
              37548: 30010,
              37549: 30522,
              37550: 32884,
              37551: 33081,
              37552: 33144,
              37553: 34678,
              37554: 35519,
              37555: 35548,
              37556: 36229,
              37557: 36339,
              37558: 37530,
              37559: 38263,
              37560: 38914,
              37561: 40165,
              37562: 21189,
              37563: 25431,
              37564: 30452,
              37565: 26389,
              37566: 27784,
              37567: 29645,
              37568: 36035,
              37569: 37806,
              37570: 38515,
              37571: 27941,
              37572: 22684,
              37573: 26894,
              37574: 27084,
              37575: 36861,
              37576: 37786,
              37577: 30171,
              37578: 36890,
              37579: 22618,
              37580: 26626,
              37581: 25524,
              37582: 27131,
              37583: 20291,
              37584: 28460,
              37585: 26584,
              37586: 36795,
              37587: 34086,
              37588: 32180,
              37589: 37716,
              37590: 26943,
              37591: 28528,
              37592: 22378,
              37593: 22775,
              37594: 23340,
              37595: 32044,
              37596: 29226,
              37597: 21514,
              37598: 37347,
              37599: 40372,
              37600: 20141,
              37601: 20302,
              37602: 20572,
              37603: 20597,
              37604: 21059,
              37605: 35998,
              37606: 21576,
              37607: 22564,
              37608: 23450,
              37609: 24093,
              37610: 24213,
              37611: 24237,
              37612: 24311,
              37613: 24351,
              37614: 24716,
              37615: 25269,
              37616: 25402,
              37617: 25552,
              37618: 26799,
              37619: 27712,
              37620: 30855,
              37621: 31118,
              37622: 31243,
              37623: 32224,
              37624: 33351,
              37625: 35330,
              37626: 35558,
              37627: 36420,
              37628: 36883,
              37696: 37048,
              37697: 37165,
              37698: 37336,
              37699: 40718,
              37700: 27877,
              37701: 25688,
              37702: 25826,
              37703: 25973,
              37704: 28404,
              37705: 30340,
              37706: 31515,
              37707: 36969,
              37708: 37841,
              37709: 28346,
              37710: 21746,
              37711: 24505,
              37712: 25764,
              37713: 36685,
              37714: 36845,
              37715: 37444,
              37716: 20856,
              37717: 22635,
              37718: 22825,
              37719: 23637,
              37720: 24215,
              37721: 28155,
              37722: 32399,
              37723: 29980,
              37724: 36028,
              37725: 36578,
              37726: 39003,
              37727: 28857,
              37728: 20253,
              37729: 27583,
              37730: 28593,
              37731: 3e4,
              37732: 38651,
              37733: 20814,
              37734: 21520,
              37735: 22581,
              37736: 22615,
              37737: 22956,
              37738: 23648,
              37739: 24466,
              37740: 26007,
              37741: 26460,
              37742: 28193,
              37743: 30331,
              37744: 33759,
              37745: 36077,
              37746: 36884,
              37747: 37117,
              37748: 37709,
              37749: 30757,
              37750: 30778,
              37751: 21162,
              37752: 24230,
              37753: 22303,
              37754: 22900,
              37755: 24594,
              37756: 20498,
              37757: 20826,
              37758: 20908,
              37760: 20941,
              37761: 20992,
              37762: 21776,
              37763: 22612,
              37764: 22616,
              37765: 22871,
              37766: 23445,
              37767: 23798,
              37768: 23947,
              37769: 24764,
              37770: 25237,
              37771: 25645,
              37772: 26481,
              37773: 26691,
              37774: 26812,
              37775: 26847,
              37776: 30423,
              37777: 28120,
              37778: 28271,
              37779: 28059,
              37780: 28783,
              37781: 29128,
              37782: 24403,
              37783: 30168,
              37784: 31095,
              37785: 31561,
              37786: 31572,
              37787: 31570,
              37788: 31958,
              37789: 32113,
              37790: 21040,
              37791: 33891,
              37792: 34153,
              37793: 34276,
              37794: 35342,
              37795: 35588,
              37796: 35910,
              37797: 36367,
              37798: 36867,
              37799: 36879,
              37800: 37913,
              37801: 38518,
              37802: 38957,
              37803: 39472,
              37804: 38360,
              37805: 20685,
              37806: 21205,
              37807: 21516,
              37808: 22530,
              37809: 23566,
              37810: 24999,
              37811: 25758,
              37812: 27934,
              37813: 30643,
              37814: 31461,
              37815: 33012,
              37816: 33796,
              37817: 36947,
              37818: 37509,
              37819: 23776,
              37820: 40199,
              37821: 21311,
              37822: 24471,
              37823: 24499,
              37824: 28060,
              37825: 29305,
              37826: 30563,
              37827: 31167,
              37828: 31716,
              37829: 27602,
              37830: 29420,
              37831: 35501,
              37832: 26627,
              37833: 27233,
              37834: 20984,
              37835: 31361,
              37836: 26932,
              37837: 23626,
              37838: 40182,
              37839: 33515,
              37840: 23493,
              37841: 37193,
              37842: 28702,
              37843: 22136,
              37844: 23663,
              37845: 24775,
              37846: 25958,
              37847: 27788,
              37848: 35930,
              37849: 36929,
              37850: 38931,
              37851: 21585,
              37852: 26311,
              37853: 37389,
              37854: 22856,
              37855: 37027,
              37856: 20869,
              37857: 20045,
              37858: 20970,
              37859: 34201,
              37860: 35598,
              37861: 28760,
              37862: 25466,
              37863: 37707,
              37864: 26978,
              37865: 39348,
              37866: 32260,
              37867: 30071,
              37868: 21335,
              37869: 26976,
              37870: 36575,
              37871: 38627,
              37872: 27741,
              37873: 20108,
              37874: 23612,
              37875: 24336,
              37876: 36841,
              37877: 21250,
              37878: 36049,
              37879: 32905,
              37880: 34425,
              37881: 24319,
              37882: 26085,
              37883: 20083,
              37884: 20837,
              37952: 22914,
              37953: 23615,
              37954: 38894,
              37955: 20219,
              37956: 22922,
              37957: 24525,
              37958: 35469,
              37959: 28641,
              37960: 31152,
              37961: 31074,
              37962: 23527,
              37963: 33905,
              37964: 29483,
              37965: 29105,
              37966: 24180,
              37967: 24565,
              37968: 25467,
              37969: 25754,
              37970: 29123,
              37971: 31896,
              37972: 20035,
              37973: 24316,
              37974: 20043,
              37975: 22492,
              37976: 22178,
              37977: 24745,
              37978: 28611,
              37979: 32013,
              37980: 33021,
              37981: 33075,
              37982: 33215,
              37983: 36786,
              37984: 35223,
              37985: 34468,
              37986: 24052,
              37987: 25226,
              37988: 25773,
              37989: 35207,
              37990: 26487,
              37991: 27874,
              37992: 27966,
              37993: 29750,
              37994: 30772,
              37995: 23110,
              37996: 32629,
              37997: 33453,
              37998: 39340,
              37999: 20467,
              38e3: 24259,
              38001: 25309,
              38002: 25490,
              38003: 25943,
              38004: 26479,
              38005: 30403,
              38006: 29260,
              38007: 32972,
              38008: 32954,
              38009: 36649,
              38010: 37197,
              38011: 20493,
              38012: 22521,
              38013: 23186,
              38014: 26757,
              38016: 26995,
              38017: 29028,
              38018: 29437,
              38019: 36023,
              38020: 22770,
              38021: 36064,
              38022: 38506,
              38023: 36889,
              38024: 34687,
              38025: 31204,
              38026: 30695,
              38027: 33833,
              38028: 20271,
              38029: 21093,
              38030: 21338,
              38031: 25293,
              38032: 26575,
              38033: 27850,
              38034: 30333,
              38035: 31636,
              38036: 31893,
              38037: 33334,
              38038: 34180,
              38039: 36843,
              38040: 26333,
              38041: 28448,
              38042: 29190,
              38043: 32283,
              38044: 33707,
              38045: 39361,
              38046: 40614,
              38047: 20989,
              38048: 31665,
              38049: 30834,
              38050: 31672,
              38051: 32903,
              38052: 31560,
              38053: 27368,
              38054: 24161,
              38055: 32908,
              38056: 30033,
              38057: 30048,
              38058: 20843,
              38059: 37474,
              38060: 28300,
              38061: 30330,
              38062: 37271,
              38063: 39658,
              38064: 20240,
              38065: 32624,
              38066: 25244,
              38067: 31567,
              38068: 38309,
              38069: 40169,
              38070: 22138,
              38071: 22617,
              38072: 34532,
              38073: 38588,
              38074: 20276,
              38075: 21028,
              38076: 21322,
              38077: 21453,
              38078: 21467,
              38079: 24070,
              38080: 25644,
              38081: 26001,
              38082: 26495,
              38083: 27710,
              38084: 27726,
              38085: 29256,
              38086: 29359,
              38087: 29677,
              38088: 30036,
              38089: 32321,
              38090: 33324,
              38091: 34281,
              38092: 36009,
              38093: 31684,
              38094: 37318,
              38095: 29033,
              38096: 38930,
              38097: 39151,
              38098: 25405,
              38099: 26217,
              38100: 30058,
              38101: 30436,
              38102: 30928,
              38103: 34115,
              38104: 34542,
              38105: 21290,
              38106: 21329,
              38107: 21542,
              38108: 22915,
              38109: 24199,
              38110: 24444,
              38111: 24754,
              38112: 25161,
              38113: 25209,
              38114: 25259,
              38115: 26e3,
              38116: 27604,
              38117: 27852,
              38118: 30130,
              38119: 30382,
              38120: 30865,
              38121: 31192,
              38122: 32203,
              38123: 32631,
              38124: 32933,
              38125: 34987,
              38126: 35513,
              38127: 36027,
              38128: 36991,
              38129: 38750,
              38130: 39131,
              38131: 27147,
              38132: 31800,
              38133: 20633,
              38134: 23614,
              38135: 24494,
              38136: 26503,
              38137: 27608,
              38138: 29749,
              38139: 30473,
              38140: 32654,
              38208: 40763,
              38209: 26570,
              38210: 31255,
              38211: 21305,
              38212: 30091,
              38213: 39661,
              38214: 24422,
              38215: 33181,
              38216: 33777,
              38217: 32920,
              38218: 24380,
              38219: 24517,
              38220: 30050,
              38221: 31558,
              38222: 36924,
              38223: 26727,
              38224: 23019,
              38225: 23195,
              38226: 32016,
              38227: 30334,
              38228: 35628,
              38229: 20469,
              38230: 24426,
              38231: 27161,
              38232: 27703,
              38233: 28418,
              38234: 29922,
              38235: 31080,
              38236: 34920,
              38237: 35413,
              38238: 35961,
              38239: 24287,
              38240: 25551,
              38241: 30149,
              38242: 31186,
              38243: 33495,
              38244: 37672,
              38245: 37618,
              38246: 33948,
              38247: 34541,
              38248: 39981,
              38249: 21697,
              38250: 24428,
              38251: 25996,
              38252: 27996,
              38253: 28693,
              38254: 36007,
              38255: 36051,
              38256: 38971,
              38257: 25935,
              38258: 29942,
              38259: 19981,
              38260: 20184,
              38261: 22496,
              38262: 22827,
              38263: 23142,
              38264: 23500,
              38265: 20904,
              38266: 24067,
              38267: 24220,
              38268: 24598,
              38269: 25206,
              38270: 25975,
              38272: 26023,
              38273: 26222,
              38274: 28014,
              38275: 29238,
              38276: 31526,
              38277: 33104,
              38278: 33178,
              38279: 33433,
              38280: 35676,
              38281: 36e3,
              38282: 36070,
              38283: 36212,
              38284: 38428,
              38285: 38468,
              38286: 20398,
              38287: 25771,
              38288: 27494,
              38289: 33310,
              38290: 33889,
              38291: 34154,
              38292: 37096,
              38293: 23553,
              38294: 26963,
              38295: 39080,
              38296: 33914,
              38297: 34135,
              38298: 20239,
              38299: 21103,
              38300: 24489,
              38301: 24133,
              38302: 26381,
              38303: 31119,
              38304: 33145,
              38305: 35079,
              38306: 35206,
              38307: 28149,
              38308: 24343,
              38309: 25173,
              38310: 27832,
              38311: 20175,
              38312: 29289,
              38313: 39826,
              38314: 20998,
              38315: 21563,
              38316: 22132,
              38317: 22707,
              38318: 24996,
              38319: 25198,
              38320: 28954,
              38321: 22894,
              38322: 31881,
              38323: 31966,
              38324: 32027,
              38325: 38640,
              38326: 25991,
              38327: 32862,
              38328: 19993,
              38329: 20341,
              38330: 20853,
              38331: 22592,
              38332: 24163,
              38333: 24179,
              38334: 24330,
              38335: 26564,
              38336: 20006,
              38337: 34109,
              38338: 38281,
              38339: 38491,
              38340: 31859,
              38341: 38913,
              38342: 20731,
              38343: 22721,
              38344: 30294,
              38345: 30887,
              38346: 21029,
              38347: 30629,
              38348: 34065,
              38349: 31622,
              38350: 20559,
              38351: 22793,
              38352: 29255,
              38353: 31687,
              38354: 32232,
              38355: 36794,
              38356: 36820,
              38357: 36941,
              38358: 20415,
              38359: 21193,
              38360: 23081,
              38361: 24321,
              38362: 38829,
              38363: 20445,
              38364: 33303,
              38365: 37610,
              38366: 22275,
              38367: 25429,
              38368: 27497,
              38369: 29995,
              38370: 35036,
              38371: 36628,
              38372: 31298,
              38373: 21215,
              38374: 22675,
              38375: 24917,
              38376: 25098,
              38377: 26286,
              38378: 27597,
              38379: 31807,
              38380: 33769,
              38381: 20515,
              38382: 20472,
              38383: 21253,
              38384: 21574,
              38385: 22577,
              38386: 22857,
              38387: 23453,
              38388: 23792,
              38389: 23791,
              38390: 23849,
              38391: 24214,
              38392: 25265,
              38393: 25447,
              38394: 25918,
              38395: 26041,
              38396: 26379,
              38464: 27861,
              38465: 27873,
              38466: 28921,
              38467: 30770,
              38468: 32299,
              38469: 32990,
              38470: 33459,
              38471: 33804,
              38472: 34028,
              38473: 34562,
              38474: 35090,
              38475: 35370,
              38476: 35914,
              38477: 37030,
              38478: 37586,
              38479: 39165,
              38480: 40179,
              38481: 40300,
              38482: 20047,
              38483: 20129,
              38484: 20621,
              38485: 21078,
              38486: 22346,
              38487: 22952,
              38488: 24125,
              38489: 24536,
              38490: 24537,
              38491: 25151,
              38492: 26292,
              38493: 26395,
              38494: 26576,
              38495: 26834,
              38496: 20882,
              38497: 32033,
              38498: 32938,
              38499: 33192,
              38500: 35584,
              38501: 35980,
              38502: 36031,
              38503: 37502,
              38504: 38450,
              38505: 21536,
              38506: 38956,
              38507: 21271,
              38508: 20693,
              38509: 21340,
              38510: 22696,
              38511: 25778,
              38512: 26420,
              38513: 29287,
              38514: 30566,
              38515: 31302,
              38516: 37350,
              38517: 21187,
              38518: 27809,
              38519: 27526,
              38520: 22528,
              38521: 24140,
              38522: 22868,
              38523: 26412,
              38524: 32763,
              38525: 20961,
              38526: 30406,
              38528: 25705,
              38529: 30952,
              38530: 39764,
              38531: 40635,
              38532: 22475,
              38533: 22969,
              38534: 26151,
              38535: 26522,
              38536: 27598,
              38537: 21737,
              38538: 27097,
              38539: 24149,
              38540: 33180,
              38541: 26517,
              38542: 39850,
              38543: 26622,
              38544: 40018,
              38545: 26717,
              38546: 20134,
              38547: 20451,
              38548: 21448,
              38549: 25273,
              38550: 26411,
              38551: 27819,
              38552: 36804,
              38553: 20397,
              38554: 32365,
              38555: 40639,
              38556: 19975,
              38557: 24930,
              38558: 28288,
              38559: 28459,
              38560: 34067,
              38561: 21619,
              38562: 26410,
              38563: 39749,
              38564: 24051,
              38565: 31637,
              38566: 23724,
              38567: 23494,
              38568: 34588,
              38569: 28234,
              38570: 34001,
              38571: 31252,
              38572: 33032,
              38573: 22937,
              38574: 31885,
              38575: 27665,
              38576: 30496,
              38577: 21209,
              38578: 22818,
              38579: 28961,
              38580: 29279,
              38581: 30683,
              38582: 38695,
              38583: 40289,
              38584: 26891,
              38585: 23167,
              38586: 23064,
              38587: 20901,
              38588: 21517,
              38589: 21629,
              38590: 26126,
              38591: 30431,
              38592: 36855,
              38593: 37528,
              38594: 40180,
              38595: 23018,
              38596: 29277,
              38597: 28357,
              38598: 20813,
              38599: 26825,
              38600: 32191,
              38601: 32236,
              38602: 38754,
              38603: 40634,
              38604: 25720,
              38605: 27169,
              38606: 33538,
              38607: 22916,
              38608: 23391,
              38609: 27611,
              38610: 29467,
              38611: 30450,
              38612: 32178,
              38613: 32791,
              38614: 33945,
              38615: 20786,
              38616: 26408,
              38617: 40665,
              38618: 30446,
              38619: 26466,
              38620: 21247,
              38621: 39173,
              38622: 23588,
              38623: 25147,
              38624: 31870,
              38625: 36016,
              38626: 21839,
              38627: 24758,
              38628: 32011,
              38629: 38272,
              38630: 21249,
              38631: 20063,
              38632: 20918,
              38633: 22812,
              38634: 29242,
              38635: 32822,
              38636: 37326,
              38637: 24357,
              38638: 30690,
              38639: 21380,
              38640: 24441,
              38641: 32004,
              38642: 34220,
              38643: 35379,
              38644: 36493,
              38645: 38742,
              38646: 26611,
              38647: 34222,
              38648: 37971,
              38649: 24841,
              38650: 24840,
              38651: 27833,
              38652: 30290,
              38720: 35565,
              38721: 36664,
              38722: 21807,
              38723: 20305,
              38724: 20778,
              38725: 21191,
              38726: 21451,
              38727: 23461,
              38728: 24189,
              38729: 24736,
              38730: 24962,
              38731: 25558,
              38732: 26377,
              38733: 26586,
              38734: 28263,
              38735: 28044,
              38736: 29494,
              38737: 29495,
              38738: 30001,
              38739: 31056,
              38740: 35029,
              38741: 35480,
              38742: 36938,
              38743: 37009,
              38744: 37109,
              38745: 38596,
              38746: 34701,
              38747: 22805,
              38748: 20104,
              38749: 20313,
              38750: 19982,
              38751: 35465,
              38752: 36671,
              38753: 38928,
              38754: 20653,
              38755: 24188,
              38756: 22934,
              38757: 23481,
              38758: 24248,
              38759: 25562,
              38760: 25594,
              38761: 25793,
              38762: 26332,
              38763: 26954,
              38764: 27096,
              38765: 27915,
              38766: 28342,
              38767: 29076,
              38768: 29992,
              38769: 31407,
              38770: 32650,
              38771: 32768,
              38772: 33865,
              38773: 33993,
              38774: 35201,
              38775: 35617,
              38776: 36362,
              38777: 36965,
              38778: 38525,
              38779: 39178,
              38780: 24958,
              38781: 25233,
              38782: 27442,
              38784: 27779,
              38785: 28020,
              38786: 32716,
              38787: 32764,
              38788: 28096,
              38789: 32645,
              38790: 34746,
              38791: 35064,
              38792: 26469,
              38793: 33713,
              38794: 38972,
              38795: 38647,
              38796: 27931,
              38797: 32097,
              38798: 33853,
              38799: 37226,
              38800: 20081,
              38801: 21365,
              38802: 23888,
              38803: 27396,
              38804: 28651,
              38805: 34253,
              38806: 34349,
              38807: 35239,
              38808: 21033,
              38809: 21519,
              38810: 23653,
              38811: 26446,
              38812: 26792,
              38813: 29702,
              38814: 29827,
              38815: 30178,
              38816: 35023,
              38817: 35041,
              38818: 37324,
              38819: 38626,
              38820: 38520,
              38821: 24459,
              38822: 29575,
              38823: 31435,
              38824: 33870,
              38825: 25504,
              38826: 30053,
              38827: 21129,
              38828: 27969,
              38829: 28316,
              38830: 29705,
              38831: 30041,
              38832: 30827,
              38833: 31890,
              38834: 38534,
              38835: 31452,
              38836: 40845,
              38837: 20406,
              38838: 24942,
              38839: 26053,
              38840: 34396,
              38841: 20102,
              38842: 20142,
              38843: 20698,
              38844: 20001,
              38845: 20940,
              38846: 23534,
              38847: 26009,
              38848: 26753,
              38849: 28092,
              38850: 29471,
              38851: 30274,
              38852: 30637,
              38853: 31260,
              38854: 31975,
              38855: 33391,
              38856: 35538,
              38857: 36988,
              38858: 37327,
              38859: 38517,
              38860: 38936,
              38861: 21147,
              38862: 32209,
              38863: 20523,
              38864: 21400,
              38865: 26519,
              38866: 28107,
              38867: 29136,
              38868: 29747,
              38869: 33256,
              38870: 36650,
              38871: 38563,
              38872: 40023,
              38873: 40607,
              38874: 29792,
              38875: 22593,
              38876: 28057,
              38877: 32047,
              38878: 39006,
              38879: 20196,
              38880: 20278,
              38881: 20363,
              38882: 20919,
              38883: 21169,
              38884: 23994,
              38885: 24604,
              38886: 29618,
              38887: 31036,
              38888: 33491,
              38889: 37428,
              38890: 38583,
              38891: 38646,
              38892: 38666,
              38893: 40599,
              38894: 40802,
              38895: 26278,
              38896: 27508,
              38897: 21015,
              38898: 21155,
              38899: 28872,
              38900: 35010,
              38901: 24265,
              38902: 24651,
              38903: 24976,
              38904: 28451,
              38905: 29001,
              38906: 31806,
              38907: 32244,
              38908: 32879,
              38976: 34030,
              38977: 36899,
              38978: 37676,
              38979: 21570,
              38980: 39791,
              38981: 27347,
              38982: 28809,
              38983: 36034,
              38984: 36335,
              38985: 38706,
              38986: 21172,
              38987: 23105,
              38988: 24266,
              38989: 24324,
              38990: 26391,
              38991: 27004,
              38992: 27028,
              38993: 28010,
              38994: 28431,
              38995: 29282,
              38996: 29436,
              38997: 31725,
              38998: 32769,
              38999: 32894,
              39e3: 34635,
              39001: 37070,
              39002: 20845,
              39003: 40595,
              39004: 31108,
              39005: 32907,
              39006: 37682,
              39007: 35542,
              39008: 20525,
              39009: 21644,
              39010: 35441,
              39011: 27498,
              39012: 36036,
              39013: 33031,
              39014: 24785,
              39015: 26528,
              39016: 40434,
              39017: 20121,
              39018: 20120,
              39019: 39952,
              39020: 35435,
              39021: 34241,
              39022: 34152,
              39023: 26880,
              39024: 28286,
              39025: 30871,
              39026: 33109,
              39071: 24332,
              39072: 19984,
              39073: 19989,
              39074: 20010,
              39075: 20017,
              39076: 20022,
              39077: 20028,
              39078: 20031,
              39079: 20034,
              39080: 20054,
              39081: 20056,
              39082: 20098,
              39083: 20101,
              39084: 35947,
              39085: 20106,
              39086: 33298,
              39087: 24333,
              39088: 20110,
              39089: 20126,
              39090: 20127,
              39091: 20128,
              39092: 20130,
              39093: 20144,
              39094: 20147,
              39095: 20150,
              39096: 20174,
              39097: 20173,
              39098: 20164,
              39099: 20166,
              39100: 20162,
              39101: 20183,
              39102: 20190,
              39103: 20205,
              39104: 20191,
              39105: 20215,
              39106: 20233,
              39107: 20314,
              39108: 20272,
              39109: 20315,
              39110: 20317,
              39111: 20311,
              39112: 20295,
              39113: 20342,
              39114: 20360,
              39115: 20367,
              39116: 20376,
              39117: 20347,
              39118: 20329,
              39119: 20336,
              39120: 20369,
              39121: 20335,
              39122: 20358,
              39123: 20374,
              39124: 20760,
              39125: 20436,
              39126: 20447,
              39127: 20430,
              39128: 20440,
              39129: 20443,
              39130: 20433,
              39131: 20442,
              39132: 20432,
              39133: 20452,
              39134: 20453,
              39135: 20506,
              39136: 20520,
              39137: 20500,
              39138: 20522,
              39139: 20517,
              39140: 20485,
              39141: 20252,
              39142: 20470,
              39143: 20513,
              39144: 20521,
              39145: 20524,
              39146: 20478,
              39147: 20463,
              39148: 20497,
              39149: 20486,
              39150: 20547,
              39151: 20551,
              39152: 26371,
              39153: 20565,
              39154: 20560,
              39155: 20552,
              39156: 20570,
              39157: 20566,
              39158: 20588,
              39159: 20600,
              39160: 20608,
              39161: 20634,
              39162: 20613,
              39163: 20660,
              39164: 20658,
              39232: 20681,
              39233: 20682,
              39234: 20659,
              39235: 20674,
              39236: 20694,
              39237: 20702,
              39238: 20709,
              39239: 20717,
              39240: 20707,
              39241: 20718,
              39242: 20729,
              39243: 20725,
              39244: 20745,
              39245: 20737,
              39246: 20738,
              39247: 20758,
              39248: 20757,
              39249: 20756,
              39250: 20762,
              39251: 20769,
              39252: 20794,
              39253: 20791,
              39254: 20796,
              39255: 20795,
              39256: 20799,
              39257: 20800,
              39258: 20818,
              39259: 20812,
              39260: 20820,
              39261: 20834,
              39262: 31480,
              39263: 20841,
              39264: 20842,
              39265: 20846,
              39266: 20864,
              39267: 20866,
              39268: 22232,
              39269: 20876,
              39270: 20873,
              39271: 20879,
              39272: 20881,
              39273: 20883,
              39274: 20885,
              39275: 20886,
              39276: 20900,
              39277: 20902,
              39278: 20898,
              39279: 20905,
              39280: 20906,
              39281: 20907,
              39282: 20915,
              39283: 20913,
              39284: 20914,
              39285: 20912,
              39286: 20917,
              39287: 20925,
              39288: 20933,
              39289: 20937,
              39290: 20955,
              39291: 20960,
              39292: 34389,
              39293: 20969,
              39294: 20973,
              39296: 20976,
              39297: 20981,
              39298: 20990,
              39299: 20996,
              39300: 21003,
              39301: 21012,
              39302: 21006,
              39303: 21031,
              39304: 21034,
              39305: 21038,
              39306: 21043,
              39307: 21049,
              39308: 21071,
              39309: 21060,
              39310: 21067,
              39311: 21068,
              39312: 21086,
              39313: 21076,
              39314: 21098,
              39315: 21108,
              39316: 21097,
              39317: 21107,
              39318: 21119,
              39319: 21117,
              39320: 21133,
              39321: 21140,
              39322: 21138,
              39323: 21105,
              39324: 21128,
              39325: 21137,
              39326: 36776,
              39327: 36775,
              39328: 21164,
              39329: 21165,
              39330: 21180,
              39331: 21173,
              39332: 21185,
              39333: 21197,
              39334: 21207,
              39335: 21214,
              39336: 21219,
              39337: 21222,
              39338: 39149,
              39339: 21216,
              39340: 21235,
              39341: 21237,
              39342: 21240,
              39343: 21241,
              39344: 21254,
              39345: 21256,
              39346: 30008,
              39347: 21261,
              39348: 21264,
              39349: 21263,
              39350: 21269,
              39351: 21274,
              39352: 21283,
              39353: 21295,
              39354: 21297,
              39355: 21299,
              39356: 21304,
              39357: 21312,
              39358: 21318,
              39359: 21317,
              39360: 19991,
              39361: 21321,
              39362: 21325,
              39363: 20950,
              39364: 21342,
              39365: 21353,
              39366: 21358,
              39367: 22808,
              39368: 21371,
              39369: 21367,
              39370: 21378,
              39371: 21398,
              39372: 21408,
              39373: 21414,
              39374: 21413,
              39375: 21422,
              39376: 21424,
              39377: 21430,
              39378: 21443,
              39379: 31762,
              39380: 38617,
              39381: 21471,
              39382: 26364,
              39383: 29166,
              39384: 21486,
              39385: 21480,
              39386: 21485,
              39387: 21498,
              39388: 21505,
              39389: 21565,
              39390: 21568,
              39391: 21548,
              39392: 21549,
              39393: 21564,
              39394: 21550,
              39395: 21558,
              39396: 21545,
              39397: 21533,
              39398: 21582,
              39399: 21647,
              39400: 21621,
              39401: 21646,
              39402: 21599,
              39403: 21617,
              39404: 21623,
              39405: 21616,
              39406: 21650,
              39407: 21627,
              39408: 21632,
              39409: 21622,
              39410: 21636,
              39411: 21648,
              39412: 21638,
              39413: 21703,
              39414: 21666,
              39415: 21688,
              39416: 21669,
              39417: 21676,
              39418: 21700,
              39419: 21704,
              39420: 21672,
              39488: 21675,
              39489: 21698,
              39490: 21668,
              39491: 21694,
              39492: 21692,
              39493: 21720,
              39494: 21733,
              39495: 21734,
              39496: 21775,
              39497: 21780,
              39498: 21757,
              39499: 21742,
              39500: 21741,
              39501: 21754,
              39502: 21730,
              39503: 21817,
              39504: 21824,
              39505: 21859,
              39506: 21836,
              39507: 21806,
              39508: 21852,
              39509: 21829,
              39510: 21846,
              39511: 21847,
              39512: 21816,
              39513: 21811,
              39514: 21853,
              39515: 21913,
              39516: 21888,
              39517: 21679,
              39518: 21898,
              39519: 21919,
              39520: 21883,
              39521: 21886,
              39522: 21912,
              39523: 21918,
              39524: 21934,
              39525: 21884,
              39526: 21891,
              39527: 21929,
              39528: 21895,
              39529: 21928,
              39530: 21978,
              39531: 21957,
              39532: 21983,
              39533: 21956,
              39534: 21980,
              39535: 21988,
              39536: 21972,
              39537: 22036,
              39538: 22007,
              39539: 22038,
              39540: 22014,
              39541: 22013,
              39542: 22043,
              39543: 22009,
              39544: 22094,
              39545: 22096,
              39546: 29151,
              39547: 22068,
              39548: 22070,
              39549: 22066,
              39550: 22072,
              39552: 22123,
              39553: 22116,
              39554: 22063,
              39555: 22124,
              39556: 22122,
              39557: 22150,
              39558: 22144,
              39559: 22154,
              39560: 22176,
              39561: 22164,
              39562: 22159,
              39563: 22181,
              39564: 22190,
              39565: 22198,
              39566: 22196,
              39567: 22210,
              39568: 22204,
              39569: 22209,
              39570: 22211,
              39571: 22208,
              39572: 22216,
              39573: 22222,
              39574: 22225,
              39575: 22227,
              39576: 22231,
              39577: 22254,
              39578: 22265,
              39579: 22272,
              39580: 22271,
              39581: 22276,
              39582: 22281,
              39583: 22280,
              39584: 22283,
              39585: 22285,
              39586: 22291,
              39587: 22296,
              39588: 22294,
              39589: 21959,
              39590: 22300,
              39591: 22310,
              39592: 22327,
              39593: 22328,
              39594: 22350,
              39595: 22331,
              39596: 22336,
              39597: 22351,
              39598: 22377,
              39599: 22464,
              39600: 22408,
              39601: 22369,
              39602: 22399,
              39603: 22409,
              39604: 22419,
              39605: 22432,
              39606: 22451,
              39607: 22436,
              39608: 22442,
              39609: 22448,
              39610: 22467,
              39611: 22470,
              39612: 22484,
              39613: 22482,
              39614: 22483,
              39615: 22538,
              39616: 22486,
              39617: 22499,
              39618: 22539,
              39619: 22553,
              39620: 22557,
              39621: 22642,
              39622: 22561,
              39623: 22626,
              39624: 22603,
              39625: 22640,
              39626: 27584,
              39627: 22610,
              39628: 22589,
              39629: 22649,
              39630: 22661,
              39631: 22713,
              39632: 22687,
              39633: 22699,
              39634: 22714,
              39635: 22750,
              39636: 22715,
              39637: 22712,
              39638: 22702,
              39639: 22725,
              39640: 22739,
              39641: 22737,
              39642: 22743,
              39643: 22745,
              39644: 22744,
              39645: 22757,
              39646: 22748,
              39647: 22756,
              39648: 22751,
              39649: 22767,
              39650: 22778,
              39651: 22777,
              39652: 22779,
              39653: 22780,
              39654: 22781,
              39655: 22786,
              39656: 22794,
              39657: 22800,
              39658: 22811,
              39659: 26790,
              39660: 22821,
              39661: 22828,
              39662: 22829,
              39663: 22834,
              39664: 22840,
              39665: 22846,
              39666: 31442,
              39667: 22869,
              39668: 22864,
              39669: 22862,
              39670: 22874,
              39671: 22872,
              39672: 22882,
              39673: 22880,
              39674: 22887,
              39675: 22892,
              39676: 22889,
              39744: 22904,
              39745: 22913,
              39746: 22941,
              39747: 20318,
              39748: 20395,
              39749: 22947,
              39750: 22962,
              39751: 22982,
              39752: 23016,
              39753: 23004,
              39754: 22925,
              39755: 23001,
              39756: 23002,
              39757: 23077,
              39758: 23071,
              39759: 23057,
              39760: 23068,
              39761: 23049,
              39762: 23066,
              39763: 23104,
              39764: 23148,
              39765: 23113,
              39766: 23093,
              39767: 23094,
              39768: 23138,
              39769: 23146,
              39770: 23194,
              39771: 23228,
              39772: 23230,
              39773: 23243,
              39774: 23234,
              39775: 23229,
              39776: 23267,
              39777: 23255,
              39778: 23270,
              39779: 23273,
              39780: 23254,
              39781: 23290,
              39782: 23291,
              39783: 23308,
              39784: 23307,
              39785: 23318,
              39786: 23346,
              39787: 23248,
              39788: 23338,
              39789: 23350,
              39790: 23358,
              39791: 23363,
              39792: 23365,
              39793: 23360,
              39794: 23377,
              39795: 23381,
              39796: 23386,
              39797: 23387,
              39798: 23397,
              39799: 23401,
              39800: 23408,
              39801: 23411,
              39802: 23413,
              39803: 23416,
              39804: 25992,
              39805: 23418,
              39806: 23424,
              39808: 23427,
              39809: 23462,
              39810: 23480,
              39811: 23491,
              39812: 23495,
              39813: 23497,
              39814: 23508,
              39815: 23504,
              39816: 23524,
              39817: 23526,
              39818: 23522,
              39819: 23518,
              39820: 23525,
              39821: 23531,
              39822: 23536,
              39823: 23542,
              39824: 23539,
              39825: 23557,
              39826: 23559,
              39827: 23560,
              39828: 23565,
              39829: 23571,
              39830: 23584,
              39831: 23586,
              39832: 23592,
              39833: 23608,
              39834: 23609,
              39835: 23617,
              39836: 23622,
              39837: 23630,
              39838: 23635,
              39839: 23632,
              39840: 23631,
              39841: 23409,
              39842: 23660,
              39843: 23662,
              39844: 20066,
              39845: 23670,
              39846: 23673,
              39847: 23692,
              39848: 23697,
              39849: 23700,
              39850: 22939,
              39851: 23723,
              39852: 23739,
              39853: 23734,
              39854: 23740,
              39855: 23735,
              39856: 23749,
              39857: 23742,
              39858: 23751,
              39859: 23769,
              39860: 23785,
              39861: 23805,
              39862: 23802,
              39863: 23789,
              39864: 23948,
              39865: 23786,
              39866: 23819,
              39867: 23829,
              39868: 23831,
              39869: 23900,
              39870: 23839,
              39871: 23835,
              39872: 23825,
              39873: 23828,
              39874: 23842,
              39875: 23834,
              39876: 23833,
              39877: 23832,
              39878: 23884,
              39879: 23890,
              39880: 23886,
              39881: 23883,
              39882: 23916,
              39883: 23923,
              39884: 23926,
              39885: 23943,
              39886: 23940,
              39887: 23938,
              39888: 23970,
              39889: 23965,
              39890: 23980,
              39891: 23982,
              39892: 23997,
              39893: 23952,
              39894: 23991,
              39895: 23996,
              39896: 24009,
              39897: 24013,
              39898: 24019,
              39899: 24018,
              39900: 24022,
              39901: 24027,
              39902: 24043,
              39903: 24050,
              39904: 24053,
              39905: 24075,
              39906: 24090,
              39907: 24089,
              39908: 24081,
              39909: 24091,
              39910: 24118,
              39911: 24119,
              39912: 24132,
              39913: 24131,
              39914: 24128,
              39915: 24142,
              39916: 24151,
              39917: 24148,
              39918: 24159,
              39919: 24162,
              39920: 24164,
              39921: 24135,
              39922: 24181,
              39923: 24182,
              39924: 24186,
              39925: 40636,
              39926: 24191,
              39927: 24224,
              39928: 24257,
              39929: 24258,
              39930: 24264,
              39931: 24272,
              39932: 24271,
              4e4: 24278,
              40001: 24291,
              40002: 24285,
              40003: 24282,
              40004: 24283,
              40005: 24290,
              40006: 24289,
              40007: 24296,
              40008: 24297,
              40009: 24300,
              40010: 24305,
              40011: 24307,
              40012: 24304,
              40013: 24308,
              40014: 24312,
              40015: 24318,
              40016: 24323,
              40017: 24329,
              40018: 24413,
              40019: 24412,
              40020: 24331,
              40021: 24337,
              40022: 24342,
              40023: 24361,
              40024: 24365,
              40025: 24376,
              40026: 24385,
              40027: 24392,
              40028: 24396,
              40029: 24398,
              40030: 24367,
              40031: 24401,
              40032: 24406,
              40033: 24407,
              40034: 24409,
              40035: 24417,
              40036: 24429,
              40037: 24435,
              40038: 24439,
              40039: 24451,
              40040: 24450,
              40041: 24447,
              40042: 24458,
              40043: 24456,
              40044: 24465,
              40045: 24455,
              40046: 24478,
              40047: 24473,
              40048: 24472,
              40049: 24480,
              40050: 24488,
              40051: 24493,
              40052: 24508,
              40053: 24534,
              40054: 24571,
              40055: 24548,
              40056: 24568,
              40057: 24561,
              40058: 24541,
              40059: 24755,
              40060: 24575,
              40061: 24609,
              40062: 24672,
              40064: 24601,
              40065: 24592,
              40066: 24617,
              40067: 24590,
              40068: 24625,
              40069: 24603,
              40070: 24597,
              40071: 24619,
              40072: 24614,
              40073: 24591,
              40074: 24634,
              40075: 24666,
              40076: 24641,
              40077: 24682,
              40078: 24695,
              40079: 24671,
              40080: 24650,
              40081: 24646,
              40082: 24653,
              40083: 24675,
              40084: 24643,
              40085: 24676,
              40086: 24642,
              40087: 24684,
              40088: 24683,
              40089: 24665,
              40090: 24705,
              40091: 24717,
              40092: 24807,
              40093: 24707,
              40094: 24730,
              40095: 24708,
              40096: 24731,
              40097: 24726,
              40098: 24727,
              40099: 24722,
              40100: 24743,
              40101: 24715,
              40102: 24801,
              40103: 24760,
              40104: 24800,
              40105: 24787,
              40106: 24756,
              40107: 24560,
              40108: 24765,
              40109: 24774,
              40110: 24757,
              40111: 24792,
              40112: 24909,
              40113: 24853,
              40114: 24838,
              40115: 24822,
              40116: 24823,
              40117: 24832,
              40118: 24820,
              40119: 24826,
              40120: 24835,
              40121: 24865,
              40122: 24827,
              40123: 24817,
              40124: 24845,
              40125: 24846,
              40126: 24903,
              40127: 24894,
              40128: 24872,
              40129: 24871,
              40130: 24906,
              40131: 24895,
              40132: 24892,
              40133: 24876,
              40134: 24884,
              40135: 24893,
              40136: 24898,
              40137: 24900,
              40138: 24947,
              40139: 24951,
              40140: 24920,
              40141: 24921,
              40142: 24922,
              40143: 24939,
              40144: 24948,
              40145: 24943,
              40146: 24933,
              40147: 24945,
              40148: 24927,
              40149: 24925,
              40150: 24915,
              40151: 24949,
              40152: 24985,
              40153: 24982,
              40154: 24967,
              40155: 25004,
              40156: 24980,
              40157: 24986,
              40158: 24970,
              40159: 24977,
              40160: 25003,
              40161: 25006,
              40162: 25036,
              40163: 25034,
              40164: 25033,
              40165: 25079,
              40166: 25032,
              40167: 25027,
              40168: 25030,
              40169: 25018,
              40170: 25035,
              40171: 32633,
              40172: 25037,
              40173: 25062,
              40174: 25059,
              40175: 25078,
              40176: 25082,
              40177: 25076,
              40178: 25087,
              40179: 25085,
              40180: 25084,
              40181: 25086,
              40182: 25088,
              40183: 25096,
              40184: 25097,
              40185: 25101,
              40186: 25100,
              40187: 25108,
              40188: 25115,
              40256: 25118,
              40257: 25121,
              40258: 25130,
              40259: 25134,
              40260: 25136,
              40261: 25138,
              40262: 25139,
              40263: 25153,
              40264: 25166,
              40265: 25182,
              40266: 25187,
              40267: 25179,
              40268: 25184,
              40269: 25192,
              40270: 25212,
              40271: 25218,
              40272: 25225,
              40273: 25214,
              40274: 25234,
              40275: 25235,
              40276: 25238,
              40277: 25300,
              40278: 25219,
              40279: 25236,
              40280: 25303,
              40281: 25297,
              40282: 25275,
              40283: 25295,
              40284: 25343,
              40285: 25286,
              40286: 25812,
              40287: 25288,
              40288: 25308,
              40289: 25292,
              40290: 25290,
              40291: 25282,
              40292: 25287,
              40293: 25243,
              40294: 25289,
              40295: 25356,
              40296: 25326,
              40297: 25329,
              40298: 25383,
              40299: 25346,
              40300: 25352,
              40301: 25327,
              40302: 25333,
              40303: 25424,
              40304: 25406,
              40305: 25421,
              40306: 25628,
              40307: 25423,
              40308: 25494,
              40309: 25486,
              40310: 25472,
              40311: 25515,
              40312: 25462,
              40313: 25507,
              40314: 25487,
              40315: 25481,
              40316: 25503,
              40317: 25525,
              40318: 25451,
              40320: 25449,
              40321: 25534,
              40322: 25577,
              40323: 25536,
              40324: 25542,
              40325: 25571,
              40326: 25545,
              40327: 25554,
              40328: 25590,
              40329: 25540,
              40330: 25622,
              40331: 25652,
              40332: 25606,
              40333: 25619,
              40334: 25638,
              40335: 25654,
              40336: 25885,
              40337: 25623,
              40338: 25640,
              40339: 25615,
              40340: 25703,
              40341: 25711,
              40342: 25718,
              40343: 25678,
              40344: 25898,
              40345: 25749,
              40346: 25747,
              40347: 25765,
              40348: 25769,
              40349: 25736,
              40350: 25788,
              40351: 25818,
              40352: 25810,
              40353: 25797,
              40354: 25799,
              40355: 25787,
              40356: 25816,
              40357: 25794,
              40358: 25841,
              40359: 25831,
              40360: 33289,
              40361: 25824,
              40362: 25825,
              40363: 25260,
              40364: 25827,
              40365: 25839,
              40366: 25900,
              40367: 25846,
              40368: 25844,
              40369: 25842,
              40370: 25850,
              40371: 25856,
              40372: 25853,
              40373: 25880,
              40374: 25884,
              40375: 25861,
              40376: 25892,
              40377: 25891,
              40378: 25899,
              40379: 25908,
              40380: 25909,
              40381: 25911,
              40382: 25910,
              40383: 25912,
              40384: 30027,
              40385: 25928,
              40386: 25942,
              40387: 25941,
              40388: 25933,
              40389: 25944,
              40390: 25950,
              40391: 25949,
              40392: 25970,
              40393: 25976,
              40394: 25986,
              40395: 25987,
              40396: 35722,
              40397: 26011,
              40398: 26015,
              40399: 26027,
              40400: 26039,
              40401: 26051,
              40402: 26054,
              40403: 26049,
              40404: 26052,
              40405: 26060,
              40406: 26066,
              40407: 26075,
              40408: 26073,
              40409: 26080,
              40410: 26081,
              40411: 26097,
              40412: 26482,
              40413: 26122,
              40414: 26115,
              40415: 26107,
              40416: 26483,
              40417: 26165,
              40418: 26166,
              40419: 26164,
              40420: 26140,
              40421: 26191,
              40422: 26180,
              40423: 26185,
              40424: 26177,
              40425: 26206,
              40426: 26205,
              40427: 26212,
              40428: 26215,
              40429: 26216,
              40430: 26207,
              40431: 26210,
              40432: 26224,
              40433: 26243,
              40434: 26248,
              40435: 26254,
              40436: 26249,
              40437: 26244,
              40438: 26264,
              40439: 26269,
              40440: 26305,
              40441: 26297,
              40442: 26313,
              40443: 26302,
              40444: 26300,
              40512: 26308,
              40513: 26296,
              40514: 26326,
              40515: 26330,
              40516: 26336,
              40517: 26175,
              40518: 26342,
              40519: 26345,
              40520: 26352,
              40521: 26357,
              40522: 26359,
              40523: 26383,
              40524: 26390,
              40525: 26398,
              40526: 26406,
              40527: 26407,
              40528: 38712,
              40529: 26414,
              40530: 26431,
              40531: 26422,
              40532: 26433,
              40533: 26424,
              40534: 26423,
              40535: 26438,
              40536: 26462,
              40537: 26464,
              40538: 26457,
              40539: 26467,
              40540: 26468,
              40541: 26505,
              40542: 26480,
              40543: 26537,
              40544: 26492,
              40545: 26474,
              40546: 26508,
              40547: 26507,
              40548: 26534,
              40549: 26529,
              40550: 26501,
              40551: 26551,
              40552: 26607,
              40553: 26548,
              40554: 26604,
              40555: 26547,
              40556: 26601,
              40557: 26552,
              40558: 26596,
              40559: 26590,
              40560: 26589,
              40561: 26594,
              40562: 26606,
              40563: 26553,
              40564: 26574,
              40565: 26566,
              40566: 26599,
              40567: 27292,
              40568: 26654,
              40569: 26694,
              40570: 26665,
              40571: 26688,
              40572: 26701,
              40573: 26674,
              40574: 26702,
              40576: 26803,
              40577: 26667,
              40578: 26713,
              40579: 26723,
              40580: 26743,
              40581: 26751,
              40582: 26783,
              40583: 26767,
              40584: 26797,
              40585: 26772,
              40586: 26781,
              40587: 26779,
              40588: 26755,
              40589: 27310,
              40590: 26809,
              40591: 26740,
              40592: 26805,
              40593: 26784,
              40594: 26810,
              40595: 26895,
              40596: 26765,
              40597: 26750,
              40598: 26881,
              40599: 26826,
              40600: 26888,
              40601: 26840,
              40602: 26914,
              40603: 26918,
              40604: 26849,
              40605: 26892,
              40606: 26829,
              40607: 26836,
              40608: 26855,
              40609: 26837,
              40610: 26934,
              40611: 26898,
              40612: 26884,
              40613: 26839,
              40614: 26851,
              40615: 26917,
              40616: 26873,
              40617: 26848,
              40618: 26863,
              40619: 26920,
              40620: 26922,
              40621: 26906,
              40622: 26915,
              40623: 26913,
              40624: 26822,
              40625: 27001,
              40626: 26999,
              40627: 26972,
              40628: 27e3,
              40629: 26987,
              40630: 26964,
              40631: 27006,
              40632: 26990,
              40633: 26937,
              40634: 26996,
              40635: 26941,
              40636: 26969,
              40637: 26928,
              40638: 26977,
              40639: 26974,
              40640: 26973,
              40641: 27009,
              40642: 26986,
              40643: 27058,
              40644: 27054,
              40645: 27088,
              40646: 27071,
              40647: 27073,
              40648: 27091,
              40649: 27070,
              40650: 27086,
              40651: 23528,
              40652: 27082,
              40653: 27101,
              40654: 27067,
              40655: 27075,
              40656: 27047,
              40657: 27182,
              40658: 27025,
              40659: 27040,
              40660: 27036,
              40661: 27029,
              40662: 27060,
              40663: 27102,
              40664: 27112,
              40665: 27138,
              40666: 27163,
              40667: 27135,
              40668: 27402,
              40669: 27129,
              40670: 27122,
              40671: 27111,
              40672: 27141,
              40673: 27057,
              40674: 27166,
              40675: 27117,
              40676: 27156,
              40677: 27115,
              40678: 27146,
              40679: 27154,
              40680: 27329,
              40681: 27171,
              40682: 27155,
              40683: 27204,
              40684: 27148,
              40685: 27250,
              40686: 27190,
              40687: 27256,
              40688: 27207,
              40689: 27234,
              40690: 27225,
              40691: 27238,
              40692: 27208,
              40693: 27192,
              40694: 27170,
              40695: 27280,
              40696: 27277,
              40697: 27296,
              40698: 27268,
              40699: 27298,
              40700: 27299,
              40768: 27287,
              40769: 34327,
              40770: 27323,
              40771: 27331,
              40772: 27330,
              40773: 27320,
              40774: 27315,
              40775: 27308,
              40776: 27358,
              40777: 27345,
              40778: 27359,
              40779: 27306,
              40780: 27354,
              40781: 27370,
              40782: 27387,
              40783: 27397,
              40784: 34326,
              40785: 27386,
              40786: 27410,
              40787: 27414,
              40788: 39729,
              40789: 27423,
              40790: 27448,
              40791: 27447,
              40792: 30428,
              40793: 27449,
              40794: 39150,
              40795: 27463,
              40796: 27459,
              40797: 27465,
              40798: 27472,
              40799: 27481,
              40800: 27476,
              40801: 27483,
              40802: 27487,
              40803: 27489,
              40804: 27512,
              40805: 27513,
              40806: 27519,
              40807: 27520,
              40808: 27524,
              40809: 27523,
              40810: 27533,
              40811: 27544,
              40812: 27541,
              40813: 27550,
              40814: 27556,
              40815: 27562,
              40816: 27563,
              40817: 27567,
              40818: 27570,
              40819: 27569,
              40820: 27571,
              40821: 27575,
              40822: 27580,
              40823: 27590,
              40824: 27595,
              40825: 27603,
              40826: 27615,
              40827: 27628,
              40828: 27627,
              40829: 27635,
              40830: 27631,
              40832: 40638,
              40833: 27656,
              40834: 27667,
              40835: 27668,
              40836: 27675,
              40837: 27684,
              40838: 27683,
              40839: 27742,
              40840: 27733,
              40841: 27746,
              40842: 27754,
              40843: 27778,
              40844: 27789,
              40845: 27802,
              40846: 27777,
              40847: 27803,
              40848: 27774,
              40849: 27752,
              40850: 27763,
              40851: 27794,
              40852: 27792,
              40853: 27844,
              40854: 27889,
              40855: 27859,
              40856: 27837,
              40857: 27863,
              40858: 27845,
              40859: 27869,
              40860: 27822,
              40861: 27825,
              40862: 27838,
              40863: 27834,
              40864: 27867,
              40865: 27887,
              40866: 27865,
              40867: 27882,
              40868: 27935,
              40869: 34893,
              40870: 27958,
              40871: 27947,
              40872: 27965,
              40873: 27960,
              40874: 27929,
              40875: 27957,
              40876: 27955,
              40877: 27922,
              40878: 27916,
              40879: 28003,
              40880: 28051,
              40881: 28004,
              40882: 27994,
              40883: 28025,
              40884: 27993,
              40885: 28046,
              40886: 28053,
              40887: 28644,
              40888: 28037,
              40889: 28153,
              40890: 28181,
              40891: 28170,
              40892: 28085,
              40893: 28103,
              40894: 28134,
              40895: 28088,
              40896: 28102,
              40897: 28140,
              40898: 28126,
              40899: 28108,
              40900: 28136,
              40901: 28114,
              40902: 28101,
              40903: 28154,
              40904: 28121,
              40905: 28132,
              40906: 28117,
              40907: 28138,
              40908: 28142,
              40909: 28205,
              40910: 28270,
              40911: 28206,
              40912: 28185,
              40913: 28274,
              40914: 28255,
              40915: 28222,
              40916: 28195,
              40917: 28267,
              40918: 28203,
              40919: 28278,
              40920: 28237,
              40921: 28191,
              40922: 28227,
              40923: 28218,
              40924: 28238,
              40925: 28196,
              40926: 28415,
              40927: 28189,
              40928: 28216,
              40929: 28290,
              40930: 28330,
              40931: 28312,
              40932: 28361,
              40933: 28343,
              40934: 28371,
              40935: 28349,
              40936: 28335,
              40937: 28356,
              40938: 28338,
              40939: 28372,
              40940: 28373,
              40941: 28303,
              40942: 28325,
              40943: 28354,
              40944: 28319,
              40945: 28481,
              40946: 28433,
              40947: 28748,
              40948: 28396,
              40949: 28408,
              40950: 28414,
              40951: 28479,
              40952: 28402,
              40953: 28465,
              40954: 28399,
              40955: 28466,
              40956: 28364,
              161: 65377,
              162: 65378,
              163: 65379,
              164: 65380,
              165: 65381,
              166: 65382,
              167: 65383,
              168: 65384,
              169: 65385,
              170: 65386,
              171: 65387,
              172: 65388,
              173: 65389,
              174: 65390,
              175: 65391,
              176: 65392,
              177: 65393,
              178: 65394,
              179: 65395,
              180: 65396,
              181: 65397,
              182: 65398,
              183: 65399,
              184: 65400,
              185: 65401,
              186: 65402,
              187: 65403,
              188: 65404,
              189: 65405,
              190: 65406,
              191: 65407,
              192: 65408,
              193: 65409,
              194: 65410,
              195: 65411,
              196: 65412,
              197: 65413,
              198: 65414,
              199: 65415,
              200: 65416,
              201: 65417,
              202: 65418,
              203: 65419,
              204: 65420,
              205: 65421,
              206: 65422,
              207: 65423,
              208: 65424,
              209: 65425,
              210: 65426,
              211: 65427,
              212: 65428,
              213: 65429,
              214: 65430,
              215: 65431,
              216: 65432,
              217: 65433,
              218: 65434,
              219: 65435,
              220: 65436,
              221: 65437,
              222: 65438,
              223: 65439,
              57408: 28478,
              57409: 28435,
              57410: 28407,
              57411: 28550,
              57412: 28538,
              57413: 28536,
              57414: 28545,
              57415: 28544,
              57416: 28527,
              57417: 28507,
              57418: 28659,
              57419: 28525,
              57420: 28546,
              57421: 28540,
              57422: 28504,
              57423: 28558,
              57424: 28561,
              57425: 28610,
              57426: 28518,
              57427: 28595,
              57428: 28579,
              57429: 28577,
              57430: 28580,
              57431: 28601,
              57432: 28614,
              57433: 28586,
              57434: 28639,
              57435: 28629,
              57436: 28652,
              57437: 28628,
              57438: 28632,
              57439: 28657,
              57440: 28654,
              57441: 28635,
              57442: 28681,
              57443: 28683,
              57444: 28666,
              57445: 28689,
              57446: 28673,
              57447: 28687,
              57448: 28670,
              57449: 28699,
              57450: 28698,
              57451: 28532,
              57452: 28701,
              57453: 28696,
              57454: 28703,
              57455: 28720,
              57456: 28734,
              57457: 28722,
              57458: 28753,
              57459: 28771,
              57460: 28825,
              57461: 28818,
              57462: 28847,
              57463: 28913,
              57464: 28844,
              57465: 28856,
              57466: 28851,
              57467: 28846,
              57468: 28895,
              57469: 28875,
              57470: 28893,
              57472: 28889,
              57473: 28937,
              57474: 28925,
              57475: 28956,
              57476: 28953,
              57477: 29029,
              57478: 29013,
              57479: 29064,
              57480: 29030,
              57481: 29026,
              57482: 29004,
              57483: 29014,
              57484: 29036,
              57485: 29071,
              57486: 29179,
              57487: 29060,
              57488: 29077,
              57489: 29096,
              57490: 29100,
              57491: 29143,
              57492: 29113,
              57493: 29118,
              57494: 29138,
              57495: 29129,
              57496: 29140,
              57497: 29134,
              57498: 29152,
              57499: 29164,
              57500: 29159,
              57501: 29173,
              57502: 29180,
              57503: 29177,
              57504: 29183,
              57505: 29197,
              57506: 29200,
              57507: 29211,
              57508: 29224,
              57509: 29229,
              57510: 29228,
              57511: 29232,
              57512: 29234,
              57513: 29243,
              57514: 29244,
              57515: 29247,
              57516: 29248,
              57517: 29254,
              57518: 29259,
              57519: 29272,
              57520: 29300,
              57521: 29310,
              57522: 29314,
              57523: 29313,
              57524: 29319,
              57525: 29330,
              57526: 29334,
              57527: 29346,
              57528: 29351,
              57529: 29369,
              57530: 29362,
              57531: 29379,
              57532: 29382,
              57533: 29380,
              57534: 29390,
              57535: 29394,
              57536: 29410,
              57537: 29408,
              57538: 29409,
              57539: 29433,
              57540: 29431,
              57541: 20495,
              57542: 29463,
              57543: 29450,
              57544: 29468,
              57545: 29462,
              57546: 29469,
              57547: 29492,
              57548: 29487,
              57549: 29481,
              57550: 29477,
              57551: 29502,
              57552: 29518,
              57553: 29519,
              57554: 40664,
              57555: 29527,
              57556: 29546,
              57557: 29544,
              57558: 29552,
              57559: 29560,
              57560: 29557,
              57561: 29563,
              57562: 29562,
              57563: 29640,
              57564: 29619,
              57565: 29646,
              57566: 29627,
              57567: 29632,
              57568: 29669,
              57569: 29678,
              57570: 29662,
              57571: 29858,
              57572: 29701,
              57573: 29807,
              57574: 29733,
              57575: 29688,
              57576: 29746,
              57577: 29754,
              57578: 29781,
              57579: 29759,
              57580: 29791,
              57581: 29785,
              57582: 29761,
              57583: 29788,
              57584: 29801,
              57585: 29808,
              57586: 29795,
              57587: 29802,
              57588: 29814,
              57589: 29822,
              57590: 29835,
              57591: 29854,
              57592: 29863,
              57593: 29898,
              57594: 29903,
              57595: 29908,
              57596: 29681,
              57664: 29920,
              57665: 29923,
              57666: 29927,
              57667: 29929,
              57668: 29934,
              57669: 29938,
              57670: 29936,
              57671: 29937,
              57672: 29944,
              57673: 29943,
              57674: 29956,
              57675: 29955,
              57676: 29957,
              57677: 29964,
              57678: 29966,
              57679: 29965,
              57680: 29973,
              57681: 29971,
              57682: 29982,
              57683: 29990,
              57684: 29996,
              57685: 30012,
              57686: 30020,
              57687: 30029,
              57688: 30026,
              57689: 30025,
              57690: 30043,
              57691: 30022,
              57692: 30042,
              57693: 30057,
              57694: 30052,
              57695: 30055,
              57696: 30059,
              57697: 30061,
              57698: 30072,
              57699: 30070,
              57700: 30086,
              57701: 30087,
              57702: 30068,
              57703: 30090,
              57704: 30089,
              57705: 30082,
              57706: 30100,
              57707: 30106,
              57708: 30109,
              57709: 30117,
              57710: 30115,
              57711: 30146,
              57712: 30131,
              57713: 30147,
              57714: 30133,
              57715: 30141,
              57716: 30136,
              57717: 30140,
              57718: 30129,
              57719: 30157,
              57720: 30154,
              57721: 30162,
              57722: 30169,
              57723: 30179,
              57724: 30174,
              57725: 30206,
              57726: 30207,
              57728: 30204,
              57729: 30209,
              57730: 30192,
              57731: 30202,
              57732: 30194,
              57733: 30195,
              57734: 30219,
              57735: 30221,
              57736: 30217,
              57737: 30239,
              57738: 30247,
              57739: 30240,
              57740: 30241,
              57741: 30242,
              57742: 30244,
              57743: 30260,
              57744: 30256,
              57745: 30267,
              57746: 30279,
              57747: 30280,
              57748: 30278,
              57749: 30300,
              57750: 30296,
              57751: 30305,
              57752: 30306,
              57753: 30312,
              57754: 30313,
              57755: 30314,
              57756: 30311,
              57757: 30316,
              57758: 30320,
              57759: 30322,
              57760: 30326,
              57761: 30328,
              57762: 30332,
              57763: 30336,
              57764: 30339,
              57765: 30344,
              57766: 30347,
              57767: 30350,
              57768: 30358,
              57769: 30355,
              57770: 30361,
              57771: 30362,
              57772: 30384,
              57773: 30388,
              57774: 30392,
              57775: 30393,
              57776: 30394,
              57777: 30402,
              57778: 30413,
              57779: 30422,
              57780: 30418,
              57781: 30430,
              57782: 30433,
              57783: 30437,
              57784: 30439,
              57785: 30442,
              57786: 34351,
              57787: 30459,
              57788: 30472,
              57789: 30471,
              57790: 30468,
              57791: 30505,
              57792: 30500,
              57793: 30494,
              57794: 30501,
              57795: 30502,
              57796: 30491,
              57797: 30519,
              57798: 30520,
              57799: 30535,
              57800: 30554,
              57801: 30568,
              57802: 30571,
              57803: 30555,
              57804: 30565,
              57805: 30591,
              57806: 30590,
              57807: 30585,
              57808: 30606,
              57809: 30603,
              57810: 30609,
              57811: 30624,
              57812: 30622,
              57813: 30640,
              57814: 30646,
              57815: 30649,
              57816: 30655,
              57817: 30652,
              57818: 30653,
              57819: 30651,
              57820: 30663,
              57821: 30669,
              57822: 30679,
              57823: 30682,
              57824: 30684,
              57825: 30691,
              57826: 30702,
              57827: 30716,
              57828: 30732,
              57829: 30738,
              57830: 31014,
              57831: 30752,
              57832: 31018,
              57833: 30789,
              57834: 30862,
              57835: 30836,
              57836: 30854,
              57837: 30844,
              57838: 30874,
              57839: 30860,
              57840: 30883,
              57841: 30901,
              57842: 30890,
              57843: 30895,
              57844: 30929,
              57845: 30918,
              57846: 30923,
              57847: 30932,
              57848: 30910,
              57849: 30908,
              57850: 30917,
              57851: 30922,
              57852: 30956,
              57920: 30951,
              57921: 30938,
              57922: 30973,
              57923: 30964,
              57924: 30983,
              57925: 30994,
              57926: 30993,
              57927: 31001,
              57928: 31020,
              57929: 31019,
              57930: 31040,
              57931: 31072,
              57932: 31063,
              57933: 31071,
              57934: 31066,
              57935: 31061,
              57936: 31059,
              57937: 31098,
              57938: 31103,
              57939: 31114,
              57940: 31133,
              57941: 31143,
              57942: 40779,
              57943: 31146,
              57944: 31150,
              57945: 31155,
              57946: 31161,
              57947: 31162,
              57948: 31177,
              57949: 31189,
              57950: 31207,
              57951: 31212,
              57952: 31201,
              57953: 31203,
              57954: 31240,
              57955: 31245,
              57956: 31256,
              57957: 31257,
              57958: 31264,
              57959: 31263,
              57960: 31104,
              57961: 31281,
              57962: 31291,
              57963: 31294,
              57964: 31287,
              57965: 31299,
              57966: 31319,
              57967: 31305,
              57968: 31329,
              57969: 31330,
              57970: 31337,
              57971: 40861,
              57972: 31344,
              57973: 31353,
              57974: 31357,
              57975: 31368,
              57976: 31383,
              57977: 31381,
              57978: 31384,
              57979: 31382,
              57980: 31401,
              57981: 31432,
              57982: 31408,
              57984: 31414,
              57985: 31429,
              57986: 31428,
              57987: 31423,
              57988: 36995,
              57989: 31431,
              57990: 31434,
              57991: 31437,
              57992: 31439,
              57993: 31445,
              57994: 31443,
              57995: 31449,
              57996: 31450,
              57997: 31453,
              57998: 31457,
              57999: 31458,
              58e3: 31462,
              58001: 31469,
              58002: 31472,
              58003: 31490,
              58004: 31503,
              58005: 31498,
              58006: 31494,
              58007: 31539,
              58008: 31512,
              58009: 31513,
              58010: 31518,
              58011: 31541,
              58012: 31528,
              58013: 31542,
              58014: 31568,
              58015: 31610,
              58016: 31492,
              58017: 31565,
              58018: 31499,
              58019: 31564,
              58020: 31557,
              58021: 31605,
              58022: 31589,
              58023: 31604,
              58024: 31591,
              58025: 31600,
              58026: 31601,
              58027: 31596,
              58028: 31598,
              58029: 31645,
              58030: 31640,
              58031: 31647,
              58032: 31629,
              58033: 31644,
              58034: 31642,
              58035: 31627,
              58036: 31634,
              58037: 31631,
              58038: 31581,
              58039: 31641,
              58040: 31691,
              58041: 31681,
              58042: 31692,
              58043: 31695,
              58044: 31668,
              58045: 31686,
              58046: 31709,
              58047: 31721,
              58048: 31761,
              58049: 31764,
              58050: 31718,
              58051: 31717,
              58052: 31840,
              58053: 31744,
              58054: 31751,
              58055: 31763,
              58056: 31731,
              58057: 31735,
              58058: 31767,
              58059: 31757,
              58060: 31734,
              58061: 31779,
              58062: 31783,
              58063: 31786,
              58064: 31775,
              58065: 31799,
              58066: 31787,
              58067: 31805,
              58068: 31820,
              58069: 31811,
              58070: 31828,
              58071: 31823,
              58072: 31808,
              58073: 31824,
              58074: 31832,
              58075: 31839,
              58076: 31844,
              58077: 31830,
              58078: 31845,
              58079: 31852,
              58080: 31861,
              58081: 31875,
              58082: 31888,
              58083: 31908,
              58084: 31917,
              58085: 31906,
              58086: 31915,
              58087: 31905,
              58088: 31912,
              58089: 31923,
              58090: 31922,
              58091: 31921,
              58092: 31918,
              58093: 31929,
              58094: 31933,
              58095: 31936,
              58096: 31941,
              58097: 31938,
              58098: 31960,
              58099: 31954,
              58100: 31964,
              58101: 31970,
              58102: 39739,
              58103: 31983,
              58104: 31986,
              58105: 31988,
              58106: 31990,
              58107: 31994,
              58108: 32006,
              58176: 32002,
              58177: 32028,
              58178: 32021,
              58179: 32010,
              58180: 32069,
              58181: 32075,
              58182: 32046,
              58183: 32050,
              58184: 32063,
              58185: 32053,
              58186: 32070,
              58187: 32115,
              58188: 32086,
              58189: 32078,
              58190: 32114,
              58191: 32104,
              58192: 32110,
              58193: 32079,
              58194: 32099,
              58195: 32147,
              58196: 32137,
              58197: 32091,
              58198: 32143,
              58199: 32125,
              58200: 32155,
              58201: 32186,
              58202: 32174,
              58203: 32163,
              58204: 32181,
              58205: 32199,
              58206: 32189,
              58207: 32171,
              58208: 32317,
              58209: 32162,
              58210: 32175,
              58211: 32220,
              58212: 32184,
              58213: 32159,
              58214: 32176,
              58215: 32216,
              58216: 32221,
              58217: 32228,
              58218: 32222,
              58219: 32251,
              58220: 32242,
              58221: 32225,
              58222: 32261,
              58223: 32266,
              58224: 32291,
              58225: 32289,
              58226: 32274,
              58227: 32305,
              58228: 32287,
              58229: 32265,
              58230: 32267,
              58231: 32290,
              58232: 32326,
              58233: 32358,
              58234: 32315,
              58235: 32309,
              58236: 32313,
              58237: 32323,
              58238: 32311,
              58240: 32306,
              58241: 32314,
              58242: 32359,
              58243: 32349,
              58244: 32342,
              58245: 32350,
              58246: 32345,
              58247: 32346,
              58248: 32377,
              58249: 32362,
              58250: 32361,
              58251: 32380,
              58252: 32379,
              58253: 32387,
              58254: 32213,
              58255: 32381,
              58256: 36782,
              58257: 32383,
              58258: 32392,
              58259: 32393,
              58260: 32396,
              58261: 32402,
              58262: 32400,
              58263: 32403,
              58264: 32404,
              58265: 32406,
              58266: 32398,
              58267: 32411,
              58268: 32412,
              58269: 32568,
              58270: 32570,
              58271: 32581,
              58272: 32588,
              58273: 32589,
              58274: 32590,
              58275: 32592,
              58276: 32593,
              58277: 32597,
              58278: 32596,
              58279: 32600,
              58280: 32607,
              58281: 32608,
              58282: 32616,
              58283: 32617,
              58284: 32615,
              58285: 32632,
              58286: 32642,
              58287: 32646,
              58288: 32643,
              58289: 32648,
              58290: 32647,
              58291: 32652,
              58292: 32660,
              58293: 32670,
              58294: 32669,
              58295: 32666,
              58296: 32675,
              58297: 32687,
              58298: 32690,
              58299: 32697,
              58300: 32686,
              58301: 32694,
              58302: 32696,
              58303: 35697,
              58304: 32709,
              58305: 32710,
              58306: 32714,
              58307: 32725,
              58308: 32724,
              58309: 32737,
              58310: 32742,
              58311: 32745,
              58312: 32755,
              58313: 32761,
              58314: 39132,
              58315: 32774,
              58316: 32772,
              58317: 32779,
              58318: 32786,
              58319: 32792,
              58320: 32793,
              58321: 32796,
              58322: 32801,
              58323: 32808,
              58324: 32831,
              58325: 32827,
              58326: 32842,
              58327: 32838,
              58328: 32850,
              58329: 32856,
              58330: 32858,
              58331: 32863,
              58332: 32866,
              58333: 32872,
              58334: 32883,
              58335: 32882,
              58336: 32880,
              58337: 32886,
              58338: 32889,
              58339: 32893,
              58340: 32895,
              58341: 32900,
              58342: 32902,
              58343: 32901,
              58344: 32923,
              58345: 32915,
              58346: 32922,
              58347: 32941,
              58348: 20880,
              58349: 32940,
              58350: 32987,
              58351: 32997,
              58352: 32985,
              58353: 32989,
              58354: 32964,
              58355: 32986,
              58356: 32982,
              58357: 33033,
              58358: 33007,
              58359: 33009,
              58360: 33051,
              58361: 33065,
              58362: 33059,
              58363: 33071,
              58364: 33099,
              58432: 38539,
              58433: 33094,
              58434: 33086,
              58435: 33107,
              58436: 33105,
              58437: 33020,
              58438: 33137,
              58439: 33134,
              58440: 33125,
              58441: 33126,
              58442: 33140,
              58443: 33155,
              58444: 33160,
              58445: 33162,
              58446: 33152,
              58447: 33154,
              58448: 33184,
              58449: 33173,
              58450: 33188,
              58451: 33187,
              58452: 33119,
              58453: 33171,
              58454: 33193,
              58455: 33200,
              58456: 33205,
              58457: 33214,
              58458: 33208,
              58459: 33213,
              58460: 33216,
              58461: 33218,
              58462: 33210,
              58463: 33225,
              58464: 33229,
              58465: 33233,
              58466: 33241,
              58467: 33240,
              58468: 33224,
              58469: 33242,
              58470: 33247,
              58471: 33248,
              58472: 33255,
              58473: 33274,
              58474: 33275,
              58475: 33278,
              58476: 33281,
              58477: 33282,
              58478: 33285,
              58479: 33287,
              58480: 33290,
              58481: 33293,
              58482: 33296,
              58483: 33302,
              58484: 33321,
              58485: 33323,
              58486: 33336,
              58487: 33331,
              58488: 33344,
              58489: 33369,
              58490: 33368,
              58491: 33373,
              58492: 33370,
              58493: 33375,
              58494: 33380,
              58496: 33378,
              58497: 33384,
              58498: 33386,
              58499: 33387,
              58500: 33326,
              58501: 33393,
              58502: 33399,
              58503: 33400,
              58504: 33406,
              58505: 33421,
              58506: 33426,
              58507: 33451,
              58508: 33439,
              58509: 33467,
              58510: 33452,
              58511: 33505,
              58512: 33507,
              58513: 33503,
              58514: 33490,
              58515: 33524,
              58516: 33523,
              58517: 33530,
              58518: 33683,
              58519: 33539,
              58520: 33531,
              58521: 33529,
              58522: 33502,
              58523: 33542,
              58524: 33500,
              58525: 33545,
              58526: 33497,
              58527: 33589,
              58528: 33588,
              58529: 33558,
              58530: 33586,
              58531: 33585,
              58532: 33600,
              58533: 33593,
              58534: 33616,
              58535: 33605,
              58536: 33583,
              58537: 33579,
              58538: 33559,
              58539: 33560,
              58540: 33669,
              58541: 33690,
              58542: 33706,
              58543: 33695,
              58544: 33698,
              58545: 33686,
              58546: 33571,
              58547: 33678,
              58548: 33671,
              58549: 33674,
              58550: 33660,
              58551: 33717,
              58552: 33651,
              58553: 33653,
              58554: 33696,
              58555: 33673,
              58556: 33704,
              58557: 33780,
              58558: 33811,
              58559: 33771,
              58560: 33742,
              58561: 33789,
              58562: 33795,
              58563: 33752,
              58564: 33803,
              58565: 33729,
              58566: 33783,
              58567: 33799,
              58568: 33760,
              58569: 33778,
              58570: 33805,
              58571: 33826,
              58572: 33824,
              58573: 33725,
              58574: 33848,
              58575: 34054,
              58576: 33787,
              58577: 33901,
              58578: 33834,
              58579: 33852,
              58580: 34138,
              58581: 33924,
              58582: 33911,
              58583: 33899,
              58584: 33965,
              58585: 33902,
              58586: 33922,
              58587: 33897,
              58588: 33862,
              58589: 33836,
              58590: 33903,
              58591: 33913,
              58592: 33845,
              58593: 33994,
              58594: 33890,
              58595: 33977,
              58596: 33983,
              58597: 33951,
              58598: 34009,
              58599: 33997,
              58600: 33979,
              58601: 34010,
              58602: 34e3,
              58603: 33985,
              58604: 33990,
              58605: 34006,
              58606: 33953,
              58607: 34081,
              58608: 34047,
              58609: 34036,
              58610: 34071,
              58611: 34072,
              58612: 34092,
              58613: 34079,
              58614: 34069,
              58615: 34068,
              58616: 34044,
              58617: 34112,
              58618: 34147,
              58619: 34136,
              58620: 34120,
              58688: 34113,
              58689: 34306,
              58690: 34123,
              58691: 34133,
              58692: 34176,
              58693: 34212,
              58694: 34184,
              58695: 34193,
              58696: 34186,
              58697: 34216,
              58698: 34157,
              58699: 34196,
              58700: 34203,
              58701: 34282,
              58702: 34183,
              58703: 34204,
              58704: 34167,
              58705: 34174,
              58706: 34192,
              58707: 34249,
              58708: 34234,
              58709: 34255,
              58710: 34233,
              58711: 34256,
              58712: 34261,
              58713: 34269,
              58714: 34277,
              58715: 34268,
              58716: 34297,
              58717: 34314,
              58718: 34323,
              58719: 34315,
              58720: 34302,
              58721: 34298,
              58722: 34310,
              58723: 34338,
              58724: 34330,
              58725: 34352,
              58726: 34367,
              58727: 34381,
              58728: 20053,
              58729: 34388,
              58730: 34399,
              58731: 34407,
              58732: 34417,
              58733: 34451,
              58734: 34467,
              58735: 34473,
              58736: 34474,
              58737: 34443,
              58738: 34444,
              58739: 34486,
              58740: 34479,
              58741: 34500,
              58742: 34502,
              58743: 34480,
              58744: 34505,
              58745: 34851,
              58746: 34475,
              58747: 34516,
              58748: 34526,
              58749: 34537,
              58750: 34540,
              58752: 34527,
              58753: 34523,
              58754: 34543,
              58755: 34578,
              58756: 34566,
              58757: 34568,
              58758: 34560,
              58759: 34563,
              58760: 34555,
              58761: 34577,
              58762: 34569,
              58763: 34573,
              58764: 34553,
              58765: 34570,
              58766: 34612,
              58767: 34623,
              58768: 34615,
              58769: 34619,
              58770: 34597,
              58771: 34601,
              58772: 34586,
              58773: 34656,
              58774: 34655,
              58775: 34680,
              58776: 34636,
              58777: 34638,
              58778: 34676,
              58779: 34647,
              58780: 34664,
              58781: 34670,
              58782: 34649,
              58783: 34643,
              58784: 34659,
              58785: 34666,
              58786: 34821,
              58787: 34722,
              58788: 34719,
              58789: 34690,
              58790: 34735,
              58791: 34763,
              58792: 34749,
              58793: 34752,
              58794: 34768,
              58795: 38614,
              58796: 34731,
              58797: 34756,
              58798: 34739,
              58799: 34759,
              58800: 34758,
              58801: 34747,
              58802: 34799,
              58803: 34802,
              58804: 34784,
              58805: 34831,
              58806: 34829,
              58807: 34814,
              58808: 34806,
              58809: 34807,
              58810: 34830,
              58811: 34770,
              58812: 34833,
              58813: 34838,
              58814: 34837,
              58815: 34850,
              58816: 34849,
              58817: 34865,
              58818: 34870,
              58819: 34873,
              58820: 34855,
              58821: 34875,
              58822: 34884,
              58823: 34882,
              58824: 34898,
              58825: 34905,
              58826: 34910,
              58827: 34914,
              58828: 34923,
              58829: 34945,
              58830: 34942,
              58831: 34974,
              58832: 34933,
              58833: 34941,
              58834: 34997,
              58835: 34930,
              58836: 34946,
              58837: 34967,
              58838: 34962,
              58839: 34990,
              58840: 34969,
              58841: 34978,
              58842: 34957,
              58843: 34980,
              58844: 34992,
              58845: 35007,
              58846: 34993,
              58847: 35011,
              58848: 35012,
              58849: 35028,
              58850: 35032,
              58851: 35033,
              58852: 35037,
              58853: 35065,
              58854: 35074,
              58855: 35068,
              58856: 35060,
              58857: 35048,
              58858: 35058,
              58859: 35076,
              58860: 35084,
              58861: 35082,
              58862: 35091,
              58863: 35139,
              58864: 35102,
              58865: 35109,
              58866: 35114,
              58867: 35115,
              58868: 35137,
              58869: 35140,
              58870: 35131,
              58871: 35126,
              58872: 35128,
              58873: 35148,
              58874: 35101,
              58875: 35168,
              58876: 35166,
              58944: 35174,
              58945: 35172,
              58946: 35181,
              58947: 35178,
              58948: 35183,
              58949: 35188,
              58950: 35191,
              58951: 35198,
              58952: 35203,
              58953: 35208,
              58954: 35210,
              58955: 35219,
              58956: 35224,
              58957: 35233,
              58958: 35241,
              58959: 35238,
              58960: 35244,
              58961: 35247,
              58962: 35250,
              58963: 35258,
              58964: 35261,
              58965: 35263,
              58966: 35264,
              58967: 35290,
              58968: 35292,
              58969: 35293,
              58970: 35303,
              58971: 35316,
              58972: 35320,
              58973: 35331,
              58974: 35350,
              58975: 35344,
              58976: 35340,
              58977: 35355,
              58978: 35357,
              58979: 35365,
              58980: 35382,
              58981: 35393,
              58982: 35419,
              58983: 35410,
              58984: 35398,
              58985: 35400,
              58986: 35452,
              58987: 35437,
              58988: 35436,
              58989: 35426,
              58990: 35461,
              58991: 35458,
              58992: 35460,
              58993: 35496,
              58994: 35489,
              58995: 35473,
              58996: 35493,
              58997: 35494,
              58998: 35482,
              58999: 35491,
              59e3: 35524,
              59001: 35533,
              59002: 35522,
              59003: 35546,
              59004: 35563,
              59005: 35571,
              59006: 35559,
              59008: 35556,
              59009: 35569,
              59010: 35604,
              59011: 35552,
              59012: 35554,
              59013: 35575,
              59014: 35550,
              59015: 35547,
              59016: 35596,
              59017: 35591,
              59018: 35610,
              59019: 35553,
              59020: 35606,
              59021: 35600,
              59022: 35607,
              59023: 35616,
              59024: 35635,
              59025: 38827,
              59026: 35622,
              59027: 35627,
              59028: 35646,
              59029: 35624,
              59030: 35649,
              59031: 35660,
              59032: 35663,
              59033: 35662,
              59034: 35657,
              59035: 35670,
              59036: 35675,
              59037: 35674,
              59038: 35691,
              59039: 35679,
              59040: 35692,
              59041: 35695,
              59042: 35700,
              59043: 35709,
              59044: 35712,
              59045: 35724,
              59046: 35726,
              59047: 35730,
              59048: 35731,
              59049: 35734,
              59050: 35737,
              59051: 35738,
              59052: 35898,
              59053: 35905,
              59054: 35903,
              59055: 35912,
              59056: 35916,
              59057: 35918,
              59058: 35920,
              59059: 35925,
              59060: 35938,
              59061: 35948,
              59062: 35960,
              59063: 35962,
              59064: 35970,
              59065: 35977,
              59066: 35973,
              59067: 35978,
              59068: 35981,
              59069: 35982,
              59070: 35988,
              59071: 35964,
              59072: 35992,
              59073: 25117,
              59074: 36013,
              59075: 36010,
              59076: 36029,
              59077: 36018,
              59078: 36019,
              59079: 36014,
              59080: 36022,
              59081: 36040,
              59082: 36033,
              59083: 36068,
              59084: 36067,
              59085: 36058,
              59086: 36093,
              59087: 36090,
              59088: 36091,
              59089: 36100,
              59090: 36101,
              59091: 36106,
              59092: 36103,
              59093: 36111,
              59094: 36109,
              59095: 36112,
              59096: 40782,
              59097: 36115,
              59098: 36045,
              59099: 36116,
              59100: 36118,
              59101: 36199,
              59102: 36205,
              59103: 36209,
              59104: 36211,
              59105: 36225,
              59106: 36249,
              59107: 36290,
              59108: 36286,
              59109: 36282,
              59110: 36303,
              59111: 36314,
              59112: 36310,
              59113: 36300,
              59114: 36315,
              59115: 36299,
              59116: 36330,
              59117: 36331,
              59118: 36319,
              59119: 36323,
              59120: 36348,
              59121: 36360,
              59122: 36361,
              59123: 36351,
              59124: 36381,
              59125: 36382,
              59126: 36368,
              59127: 36383,
              59128: 36418,
              59129: 36405,
              59130: 36400,
              59131: 36404,
              59132: 36426,
              59200: 36423,
              59201: 36425,
              59202: 36428,
              59203: 36432,
              59204: 36424,
              59205: 36441,
              59206: 36452,
              59207: 36448,
              59208: 36394,
              59209: 36451,
              59210: 36437,
              59211: 36470,
              59212: 36466,
              59213: 36476,
              59214: 36481,
              59215: 36487,
              59216: 36485,
              59217: 36484,
              59218: 36491,
              59219: 36490,
              59220: 36499,
              59221: 36497,
              59222: 36500,
              59223: 36505,
              59224: 36522,
              59225: 36513,
              59226: 36524,
              59227: 36528,
              59228: 36550,
              59229: 36529,
              59230: 36542,
              59231: 36549,
              59232: 36552,
              59233: 36555,
              59234: 36571,
              59235: 36579,
              59236: 36604,
              59237: 36603,
              59238: 36587,
              59239: 36606,
              59240: 36618,
              59241: 36613,
              59242: 36629,
              59243: 36626,
              59244: 36633,
              59245: 36627,
              59246: 36636,
              59247: 36639,
              59248: 36635,
              59249: 36620,
              59250: 36646,
              59251: 36659,
              59252: 36667,
              59253: 36665,
              59254: 36677,
              59255: 36674,
              59256: 36670,
              59257: 36684,
              59258: 36681,
              59259: 36678,
              59260: 36686,
              59261: 36695,
              59262: 36700,
              59264: 36706,
              59265: 36707,
              59266: 36708,
              59267: 36764,
              59268: 36767,
              59269: 36771,
              59270: 36781,
              59271: 36783,
              59272: 36791,
              59273: 36826,
              59274: 36837,
              59275: 36834,
              59276: 36842,
              59277: 36847,
              59278: 36999,
              59279: 36852,
              59280: 36869,
              59281: 36857,
              59282: 36858,
              59283: 36881,
              59284: 36885,
              59285: 36897,
              59286: 36877,
              59287: 36894,
              59288: 36886,
              59289: 36875,
              59290: 36903,
              59291: 36918,
              59292: 36917,
              59293: 36921,
              59294: 36856,
              59295: 36943,
              59296: 36944,
              59297: 36945,
              59298: 36946,
              59299: 36878,
              59300: 36937,
              59301: 36926,
              59302: 36950,
              59303: 36952,
              59304: 36958,
              59305: 36968,
              59306: 36975,
              59307: 36982,
              59308: 38568,
              59309: 36978,
              59310: 36994,
              59311: 36989,
              59312: 36993,
              59313: 36992,
              59314: 37002,
              59315: 37001,
              59316: 37007,
              59317: 37032,
              59318: 37039,
              59319: 37041,
              59320: 37045,
              59321: 37090,
              59322: 37092,
              59323: 25160,
              59324: 37083,
              59325: 37122,
              59326: 37138,
              59327: 37145,
              59328: 37170,
              59329: 37168,
              59330: 37194,
              59331: 37206,
              59332: 37208,
              59333: 37219,
              59334: 37221,
              59335: 37225,
              59336: 37235,
              59337: 37234,
              59338: 37259,
              59339: 37257,
              59340: 37250,
              59341: 37282,
              59342: 37291,
              59343: 37295,
              59344: 37290,
              59345: 37301,
              59346: 37300,
              59347: 37306,
              59348: 37312,
              59349: 37313,
              59350: 37321,
              59351: 37323,
              59352: 37328,
              59353: 37334,
              59354: 37343,
              59355: 37345,
              59356: 37339,
              59357: 37372,
              59358: 37365,
              59359: 37366,
              59360: 37406,
              59361: 37375,
              59362: 37396,
              59363: 37420,
              59364: 37397,
              59365: 37393,
              59366: 37470,
              59367: 37463,
              59368: 37445,
              59369: 37449,
              59370: 37476,
              59371: 37448,
              59372: 37525,
              59373: 37439,
              59374: 37451,
              59375: 37456,
              59376: 37532,
              59377: 37526,
              59378: 37523,
              59379: 37531,
              59380: 37466,
              59381: 37583,
              59382: 37561,
              59383: 37559,
              59384: 37609,
              59385: 37647,
              59386: 37626,
              59387: 37700,
              59388: 37678,
              59456: 37657,
              59457: 37666,
              59458: 37658,
              59459: 37667,
              59460: 37690,
              59461: 37685,
              59462: 37691,
              59463: 37724,
              59464: 37728,
              59465: 37756,
              59466: 37742,
              59467: 37718,
              59468: 37808,
              59469: 37804,
              59470: 37805,
              59471: 37780,
              59472: 37817,
              59473: 37846,
              59474: 37847,
              59475: 37864,
              59476: 37861,
              59477: 37848,
              59478: 37827,
              59479: 37853,
              59480: 37840,
              59481: 37832,
              59482: 37860,
              59483: 37914,
              59484: 37908,
              59485: 37907,
              59486: 37891,
              59487: 37895,
              59488: 37904,
              59489: 37942,
              59490: 37931,
              59491: 37941,
              59492: 37921,
              59493: 37946,
              59494: 37953,
              59495: 37970,
              59496: 37956,
              59497: 37979,
              59498: 37984,
              59499: 37986,
              59500: 37982,
              59501: 37994,
              59502: 37417,
              59503: 38e3,
              59504: 38005,
              59505: 38007,
              59506: 38013,
              59507: 37978,
              59508: 38012,
              59509: 38014,
              59510: 38017,
              59511: 38015,
              59512: 38274,
              59513: 38279,
              59514: 38282,
              59515: 38292,
              59516: 38294,
              59517: 38296,
              59518: 38297,
              59520: 38304,
              59521: 38312,
              59522: 38311,
              59523: 38317,
              59524: 38332,
              59525: 38331,
              59526: 38329,
              59527: 38334,
              59528: 38346,
              59529: 28662,
              59530: 38339,
              59531: 38349,
              59532: 38348,
              59533: 38357,
              59534: 38356,
              59535: 38358,
              59536: 38364,
              59537: 38369,
              59538: 38373,
              59539: 38370,
              59540: 38433,
              59541: 38440,
              59542: 38446,
              59543: 38447,
              59544: 38466,
              59545: 38476,
              59546: 38479,
              59547: 38475,
              59548: 38519,
              59549: 38492,
              59550: 38494,
              59551: 38493,
              59552: 38495,
              59553: 38502,
              59554: 38514,
              59555: 38508,
              59556: 38541,
              59557: 38552,
              59558: 38549,
              59559: 38551,
              59560: 38570,
              59561: 38567,
              59562: 38577,
              59563: 38578,
              59564: 38576,
              59565: 38580,
              59566: 38582,
              59567: 38584,
              59568: 38585,
              59569: 38606,
              59570: 38603,
              59571: 38601,
              59572: 38605,
              59573: 35149,
              59574: 38620,
              59575: 38669,
              59576: 38613,
              59577: 38649,
              59578: 38660,
              59579: 38662,
              59580: 38664,
              59581: 38675,
              59582: 38670,
              59583: 38673,
              59584: 38671,
              59585: 38678,
              59586: 38681,
              59587: 38692,
              59588: 38698,
              59589: 38704,
              59590: 38713,
              59591: 38717,
              59592: 38718,
              59593: 38724,
              59594: 38726,
              59595: 38728,
              59596: 38722,
              59597: 38729,
              59598: 38748,
              59599: 38752,
              59600: 38756,
              59601: 38758,
              59602: 38760,
              59603: 21202,
              59604: 38763,
              59605: 38769,
              59606: 38777,
              59607: 38789,
              59608: 38780,
              59609: 38785,
              59610: 38778,
              59611: 38790,
              59612: 38795,
              59613: 38799,
              59614: 38800,
              59615: 38812,
              59616: 38824,
              59617: 38822,
              59618: 38819,
              59619: 38835,
              59620: 38836,
              59621: 38851,
              59622: 38854,
              59623: 38856,
              59624: 38859,
              59625: 38876,
              59626: 38893,
              59627: 40783,
              59628: 38898,
              59629: 31455,
              59630: 38902,
              59631: 38901,
              59632: 38927,
              59633: 38924,
              59634: 38968,
              59635: 38948,
              59636: 38945,
              59637: 38967,
              59638: 38973,
              59639: 38982,
              59640: 38991,
              59641: 38987,
              59642: 39019,
              59643: 39023,
              59644: 39024,
              59712: 39025,
              59713: 39028,
              59714: 39027,
              59715: 39082,
              59716: 39087,
              59717: 39089,
              59718: 39094,
              59719: 39108,
              59720: 39107,
              59721: 39110,
              59722: 39145,
              59723: 39147,
              59724: 39171,
              59725: 39177,
              59726: 39186,
              59727: 39188,
              59728: 39192,
              59729: 39201,
              59730: 39197,
              59731: 39198,
              59732: 39204,
              59733: 39200,
              59734: 39212,
              59735: 39214,
              59736: 39229,
              59737: 39230,
              59738: 39234,
              59739: 39241,
              59740: 39237,
              59741: 39248,
              59742: 39243,
              59743: 39249,
              59744: 39250,
              59745: 39244,
              59746: 39253,
              59747: 39319,
              59748: 39320,
              59749: 39333,
              59750: 39341,
              59751: 39342,
              59752: 39356,
              59753: 39391,
              59754: 39387,
              59755: 39389,
              59756: 39384,
              59757: 39377,
              59758: 39405,
              59759: 39406,
              59760: 39409,
              59761: 39410,
              59762: 39419,
              59763: 39416,
              59764: 39425,
              59765: 39439,
              59766: 39429,
              59767: 39394,
              59768: 39449,
              59769: 39467,
              59770: 39479,
              59771: 39493,
              59772: 39490,
              59773: 39488,
              59774: 39491,
              59776: 39486,
              59777: 39509,
              59778: 39501,
              59779: 39515,
              59780: 39511,
              59781: 39519,
              59782: 39522,
              59783: 39525,
              59784: 39524,
              59785: 39529,
              59786: 39531,
              59787: 39530,
              59788: 39597,
              59789: 39600,
              59790: 39612,
              59791: 39616,
              59792: 39631,
              59793: 39633,
              59794: 39635,
              59795: 39636,
              59796: 39646,
              59797: 39647,
              59798: 39650,
              59799: 39651,
              59800: 39654,
              59801: 39663,
              59802: 39659,
              59803: 39662,
              59804: 39668,
              59805: 39665,
              59806: 39671,
              59807: 39675,
              59808: 39686,
              59809: 39704,
              59810: 39706,
              59811: 39711,
              59812: 39714,
              59813: 39715,
              59814: 39717,
              59815: 39719,
              59816: 39720,
              59817: 39721,
              59818: 39722,
              59819: 39726,
              59820: 39727,
              59821: 39730,
              59822: 39748,
              59823: 39747,
              59824: 39759,
              59825: 39757,
              59826: 39758,
              59827: 39761,
              59828: 39768,
              59829: 39796,
              59830: 39827,
              59831: 39811,
              59832: 39825,
              59833: 39830,
              59834: 39831,
              59835: 39839,
              59836: 39840,
              59837: 39848,
              59838: 39860,
              59839: 39872,
              59840: 39882,
              59841: 39865,
              59842: 39878,
              59843: 39887,
              59844: 39889,
              59845: 39890,
              59846: 39907,
              59847: 39906,
              59848: 39908,
              59849: 39892,
              59850: 39905,
              59851: 39994,
              59852: 39922,
              59853: 39921,
              59854: 39920,
              59855: 39957,
              59856: 39956,
              59857: 39945,
              59858: 39955,
              59859: 39948,
              59860: 39942,
              59861: 39944,
              59862: 39954,
              59863: 39946,
              59864: 39940,
              59865: 39982,
              59866: 39963,
              59867: 39973,
              59868: 39972,
              59869: 39969,
              59870: 39984,
              59871: 40007,
              59872: 39986,
              59873: 40006,
              59874: 39998,
              59875: 40026,
              59876: 40032,
              59877: 40039,
              59878: 40054,
              59879: 40056,
              59880: 40167,
              59881: 40172,
              59882: 40176,
              59883: 40201,
              59884: 40200,
              59885: 40171,
              59886: 40195,
              59887: 40198,
              59888: 40234,
              59889: 40230,
              59890: 40367,
              59891: 40227,
              59892: 40223,
              59893: 40260,
              59894: 40213,
              59895: 40210,
              59896: 40257,
              59897: 40255,
              59898: 40254,
              59899: 40262,
              59900: 40264,
              59968: 40285,
              59969: 40286,
              59970: 40292,
              59971: 40273,
              59972: 40272,
              59973: 40281,
              59974: 40306,
              59975: 40329,
              59976: 40327,
              59977: 40363,
              59978: 40303,
              59979: 40314,
              59980: 40346,
              59981: 40356,
              59982: 40361,
              59983: 40370,
              59984: 40388,
              59985: 40385,
              59986: 40379,
              59987: 40376,
              59988: 40378,
              59989: 40390,
              59990: 40399,
              59991: 40386,
              59992: 40409,
              59993: 40403,
              59994: 40440,
              59995: 40422,
              59996: 40429,
              59997: 40431,
              59998: 40445,
              59999: 40474,
              6e4: 40475,
              60001: 40478,
              60002: 40565,
              60003: 40569,
              60004: 40573,
              60005: 40577,
              60006: 40584,
              60007: 40587,
              60008: 40588,
              60009: 40594,
              60010: 40597,
              60011: 40593,
              60012: 40605,
              60013: 40613,
              60014: 40617,
              60015: 40632,
              60016: 40618,
              60017: 40621,
              60018: 38753,
              60019: 40652,
              60020: 40654,
              60021: 40655,
              60022: 40656,
              60023: 40660,
              60024: 40668,
              60025: 40670,
              60026: 40669,
              60027: 40672,
              60028: 40677,
              60029: 40680,
              60030: 40687,
              60032: 40692,
              60033: 40694,
              60034: 40695,
              60035: 40697,
              60036: 40699,
              60037: 40700,
              60038: 40701,
              60039: 40711,
              60040: 40712,
              60041: 30391,
              60042: 40725,
              60043: 40737,
              60044: 40748,
              60045: 40766,
              60046: 40778,
              60047: 40786,
              60048: 40788,
              60049: 40803,
              60050: 40799,
              60051: 40800,
              60052: 40801,
              60053: 40806,
              60054: 40807,
              60055: 40812,
              60056: 40810,
              60057: 40823,
              60058: 40818,
              60059: 40822,
              60060: 40853,
              60061: 40860,
              60062: 40864,
              60063: 22575,
              60064: 27079,
              60065: 36953,
              60066: 29796,
              60067: 20956,
              60068: 29081
            };
          }),
          /* 9 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var GenericGF_1 = __webpack_require__(1);
            var GenericGFPoly_1 = __webpack_require__(2);
            function runEuclideanAlgorithm(field, a, b, R) {
              var _a;
              if (a.degree() < b.degree()) {
                _a = [b, a], a = _a[0], b = _a[1];
              }
              var rLast = a;
              var r = b;
              var tLast = field.zero;
              var t = field.one;
              while (r.degree() >= R / 2) {
                var rLastLast = rLast;
                var tLastLast = tLast;
                rLast = r;
                tLast = t;
                if (rLast.isZero()) {
                  return null;
                }
                r = rLastLast;
                var q = field.zero;
                var denominatorLeadingTerm = rLast.getCoefficient(rLast.degree());
                var dltInverse = field.inverse(denominatorLeadingTerm);
                while (r.degree() >= rLast.degree() && !r.isZero()) {
                  var degreeDiff = r.degree() - rLast.degree();
                  var scale = field.multiply(r.getCoefficient(r.degree()), dltInverse);
                  q = q.addOrSubtract(field.buildMonomial(degreeDiff, scale));
                  r = r.addOrSubtract(rLast.multiplyByMonomial(degreeDiff, scale));
                }
                t = q.multiplyPoly(tLast).addOrSubtract(tLastLast);
                if (r.degree() >= rLast.degree()) {
                  return null;
                }
              }
              var sigmaTildeAtZero = t.getCoefficient(0);
              if (sigmaTildeAtZero === 0) {
                return null;
              }
              var inverse = field.inverse(sigmaTildeAtZero);
              return [t.multiply(inverse), r.multiply(inverse)];
            }
            function findErrorLocations(field, errorLocator) {
              var numErrors = errorLocator.degree();
              if (numErrors === 1) {
                return [errorLocator.getCoefficient(1)];
              }
              var result = new Array(numErrors);
              var errorCount = 0;
              for (var i = 1; i < field.size && errorCount < numErrors; i++) {
                if (errorLocator.evaluateAt(i) === 0) {
                  result[errorCount] = field.inverse(i);
                  errorCount++;
                }
              }
              if (errorCount !== numErrors) {
                return null;
              }
              return result;
            }
            function findErrorMagnitudes(field, errorEvaluator, errorLocations) {
              var s = errorLocations.length;
              var result = new Array(s);
              for (var i = 0; i < s; i++) {
                var xiInverse = field.inverse(errorLocations[i]);
                var denominator = 1;
                for (var j = 0; j < s; j++) {
                  if (i !== j) {
                    denominator = field.multiply(denominator, GenericGF_1.addOrSubtractGF(1, field.multiply(errorLocations[j], xiInverse)));
                  }
                }
                result[i] = field.multiply(errorEvaluator.evaluateAt(xiInverse), field.inverse(denominator));
                if (field.generatorBase !== 0) {
                  result[i] = field.multiply(result[i], xiInverse);
                }
              }
              return result;
            }
            function decode(bytes, twoS) {
              var outputBytes = new Uint8ClampedArray(bytes.length);
              outputBytes.set(bytes);
              var field = new GenericGF_1.default(285, 256, 0);
              var poly = new GenericGFPoly_1.default(field, outputBytes);
              var syndromeCoefficients = new Uint8ClampedArray(twoS);
              var error = false;
              for (var s = 0; s < twoS; s++) {
                var evaluation = poly.evaluateAt(field.exp(s + field.generatorBase));
                syndromeCoefficients[syndromeCoefficients.length - 1 - s] = evaluation;
                if (evaluation !== 0) {
                  error = true;
                }
              }
              if (!error) {
                return outputBytes;
              }
              var syndrome = new GenericGFPoly_1.default(field, syndromeCoefficients);
              var sigmaOmega = runEuclideanAlgorithm(field, field.buildMonomial(twoS, 1), syndrome, twoS);
              if (sigmaOmega === null) {
                return null;
              }
              var errorLocations = findErrorLocations(field, sigmaOmega[0]);
              if (errorLocations == null) {
                return null;
              }
              var errorMagnitudes = findErrorMagnitudes(field, sigmaOmega[1], errorLocations);
              for (var i = 0; i < errorLocations.length; i++) {
                var position = outputBytes.length - 1 - field.log(errorLocations[i]);
                if (position < 0) {
                  return null;
                }
                outputBytes[position] = GenericGF_1.addOrSubtractGF(outputBytes[position], errorMagnitudes[i]);
              }
              return outputBytes;
            }
            exports2.decode = decode;
          }),
          /* 10 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            exports2.VERSIONS = [
              {
                infoBits: null,
                versionNumber: 1,
                alignmentPatternCenters: [],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 7,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 19 }]
                  },
                  {
                    ecCodewordsPerBlock: 10,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 16 }]
                  },
                  {
                    ecCodewordsPerBlock: 13,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 13 }]
                  },
                  {
                    ecCodewordsPerBlock: 17,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 9 }]
                  }
                ]
              },
              {
                infoBits: null,
                versionNumber: 2,
                alignmentPatternCenters: [6, 18],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 10,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 34 }]
                  },
                  {
                    ecCodewordsPerBlock: 16,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 28 }]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 22 }]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 16 }]
                  }
                ]
              },
              {
                infoBits: null,
                versionNumber: 3,
                alignmentPatternCenters: [6, 22],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 15,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 55 }]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 44 }]
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 17 }]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 13 }]
                  }
                ]
              },
              {
                infoBits: null,
                versionNumber: 4,
                alignmentPatternCenters: [6, 26],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 80 }]
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 32 }]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 24 }]
                  },
                  {
                    ecCodewordsPerBlock: 16,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 9 }]
                  }
                ]
              },
              {
                infoBits: null,
                versionNumber: 5,
                alignmentPatternCenters: [6, 30],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 108 }]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 43 }]
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 15 },
                      { numBlocks: 2, dataCodewordsPerBlock: 16 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 11 },
                      { numBlocks: 2, dataCodewordsPerBlock: 12 }
                    ]
                  }
                ]
              },
              {
                infoBits: null,
                versionNumber: 6,
                alignmentPatternCenters: [6, 34],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 68 }]
                  },
                  {
                    ecCodewordsPerBlock: 16,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 27 }]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 19 }]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 15 }]
                  }
                ]
              },
              {
                infoBits: 31892,
                versionNumber: 7,
                alignmentPatternCenters: [6, 22, 38],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 78 }]
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 31 }]
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 14 },
                      { numBlocks: 4, dataCodewordsPerBlock: 15 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 13 },
                      { numBlocks: 1, dataCodewordsPerBlock: 14 }
                    ]
                  }
                ]
              },
              {
                infoBits: 34236,
                versionNumber: 8,
                alignmentPatternCenters: [6, 24, 42],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 97 }]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 38 },
                      { numBlocks: 2, dataCodewordsPerBlock: 39 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 18 },
                      { numBlocks: 2, dataCodewordsPerBlock: 19 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 14 },
                      { numBlocks: 2, dataCodewordsPerBlock: 15 }
                    ]
                  }
                ]
              },
              {
                infoBits: 39577,
                versionNumber: 9,
                alignmentPatternCenters: [6, 26, 46],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 116 }]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 36 },
                      { numBlocks: 2, dataCodewordsPerBlock: 37 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 16 },
                      { numBlocks: 4, dataCodewordsPerBlock: 17 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 12 },
                      { numBlocks: 4, dataCodewordsPerBlock: 13 }
                    ]
                  }
                ]
              },
              {
                infoBits: 42195,
                versionNumber: 10,
                alignmentPatternCenters: [6, 28, 50],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 68 },
                      { numBlocks: 2, dataCodewordsPerBlock: 69 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 43 },
                      { numBlocks: 1, dataCodewordsPerBlock: 44 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 19 },
                      { numBlocks: 2, dataCodewordsPerBlock: 20 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 15 },
                      { numBlocks: 2, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 48118,
                versionNumber: 11,
                alignmentPatternCenters: [6, 30, 54],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 81 }]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 50 },
                      { numBlocks: 4, dataCodewordsPerBlock: 51 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 22 },
                      { numBlocks: 4, dataCodewordsPerBlock: 23 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 12 },
                      { numBlocks: 8, dataCodewordsPerBlock: 13 }
                    ]
                  }
                ]
              },
              {
                infoBits: 51042,
                versionNumber: 12,
                alignmentPatternCenters: [6, 32, 58],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 92 },
                      { numBlocks: 2, dataCodewordsPerBlock: 93 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 36 },
                      { numBlocks: 2, dataCodewordsPerBlock: 37 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 20 },
                      { numBlocks: 6, dataCodewordsPerBlock: 21 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 14 },
                      { numBlocks: 4, dataCodewordsPerBlock: 15 }
                    ]
                  }
                ]
              },
              {
                infoBits: 55367,
                versionNumber: 13,
                alignmentPatternCenters: [6, 34, 62],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 107 }]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 37 },
                      { numBlocks: 1, dataCodewordsPerBlock: 38 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 20 },
                      { numBlocks: 4, dataCodewordsPerBlock: 21 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 11 },
                      { numBlocks: 4, dataCodewordsPerBlock: 12 }
                    ]
                  }
                ]
              },
              {
                infoBits: 58893,
                versionNumber: 14,
                alignmentPatternCenters: [6, 26, 46, 66],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 115 },
                      { numBlocks: 1, dataCodewordsPerBlock: 116 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 40 },
                      { numBlocks: 5, dataCodewordsPerBlock: 41 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 16 },
                      { numBlocks: 5, dataCodewordsPerBlock: 17 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 12 },
                      { numBlocks: 5, dataCodewordsPerBlock: 13 }
                    ]
                  }
                ]
              },
              {
                infoBits: 63784,
                versionNumber: 15,
                alignmentPatternCenters: [6, 26, 48, 70],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 87 },
                      { numBlocks: 1, dataCodewordsPerBlock: 88 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 41 },
                      { numBlocks: 5, dataCodewordsPerBlock: 42 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 24 },
                      { numBlocks: 7, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 12 },
                      { numBlocks: 7, dataCodewordsPerBlock: 13 }
                    ]
                  }
                ]
              },
              {
                infoBits: 68472,
                versionNumber: 16,
                alignmentPatternCenters: [6, 26, 50, 74],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 98 },
                      { numBlocks: 1, dataCodewordsPerBlock: 99 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 45 },
                      { numBlocks: 3, dataCodewordsPerBlock: 46 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 19 },
                      { numBlocks: 2, dataCodewordsPerBlock: 20 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 15 },
                      { numBlocks: 13, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 70749,
                versionNumber: 17,
                alignmentPatternCenters: [6, 30, 54, 78],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 107 },
                      { numBlocks: 5, dataCodewordsPerBlock: 108 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 46 },
                      { numBlocks: 1, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 22 },
                      { numBlocks: 15, dataCodewordsPerBlock: 23 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 14 },
                      { numBlocks: 17, dataCodewordsPerBlock: 15 }
                    ]
                  }
                ]
              },
              {
                infoBits: 76311,
                versionNumber: 18,
                alignmentPatternCenters: [6, 30, 56, 82],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 120 },
                      { numBlocks: 1, dataCodewordsPerBlock: 121 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 9, dataCodewordsPerBlock: 43 },
                      { numBlocks: 4, dataCodewordsPerBlock: 44 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 22 },
                      { numBlocks: 1, dataCodewordsPerBlock: 23 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 14 },
                      { numBlocks: 19, dataCodewordsPerBlock: 15 }
                    ]
                  }
                ]
              },
              {
                infoBits: 79154,
                versionNumber: 19,
                alignmentPatternCenters: [6, 30, 58, 86],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 113 },
                      { numBlocks: 4, dataCodewordsPerBlock: 114 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 44 },
                      { numBlocks: 11, dataCodewordsPerBlock: 45 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 21 },
                      { numBlocks: 4, dataCodewordsPerBlock: 22 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 9, dataCodewordsPerBlock: 13 },
                      { numBlocks: 16, dataCodewordsPerBlock: 14 }
                    ]
                  }
                ]
              },
              {
                infoBits: 84390,
                versionNumber: 20,
                alignmentPatternCenters: [6, 34, 62, 90],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 107 },
                      { numBlocks: 5, dataCodewordsPerBlock: 108 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 41 },
                      { numBlocks: 13, dataCodewordsPerBlock: 42 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 24 },
                      { numBlocks: 5, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 15 },
                      { numBlocks: 10, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 87683,
                versionNumber: 21,
                alignmentPatternCenters: [6, 28, 50, 72, 94],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 116 },
                      { numBlocks: 4, dataCodewordsPerBlock: 117 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 42 }]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 22 },
                      { numBlocks: 6, dataCodewordsPerBlock: 23 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 16 },
                      { numBlocks: 6, dataCodewordsPerBlock: 17 }
                    ]
                  }
                ]
              },
              {
                infoBits: 92361,
                versionNumber: 22,
                alignmentPatternCenters: [6, 26, 50, 74, 98],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 111 },
                      { numBlocks: 7, dataCodewordsPerBlock: 112 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 46 }]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 24 },
                      { numBlocks: 16, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 34, dataCodewordsPerBlock: 13 }]
                  }
                ]
              },
              {
                infoBits: 96236,
                versionNumber: 23,
                alignmentPatternCenters: [6, 30, 54, 74, 102],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 121 },
                      { numBlocks: 5, dataCodewordsPerBlock: 122 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 47 },
                      { numBlocks: 14, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 24 },
                      { numBlocks: 14, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 16, dataCodewordsPerBlock: 15 },
                      { numBlocks: 14, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 102084,
                versionNumber: 24,
                alignmentPatternCenters: [6, 28, 54, 80, 106],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 117 },
                      { numBlocks: 4, dataCodewordsPerBlock: 118 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 45 },
                      { numBlocks: 14, dataCodewordsPerBlock: 46 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 24 },
                      { numBlocks: 16, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 30, dataCodewordsPerBlock: 16 },
                      { numBlocks: 2, dataCodewordsPerBlock: 17 }
                    ]
                  }
                ]
              },
              {
                infoBits: 102881,
                versionNumber: 25,
                alignmentPatternCenters: [6, 32, 58, 84, 110],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 106 },
                      { numBlocks: 4, dataCodewordsPerBlock: 107 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 47 },
                      { numBlocks: 13, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 24 },
                      { numBlocks: 22, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 22, dataCodewordsPerBlock: 15 },
                      { numBlocks: 13, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 110507,
                versionNumber: 26,
                alignmentPatternCenters: [6, 30, 58, 86, 114],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 114 },
                      { numBlocks: 2, dataCodewordsPerBlock: 115 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 46 },
                      { numBlocks: 4, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 28, dataCodewordsPerBlock: 22 },
                      { numBlocks: 6, dataCodewordsPerBlock: 23 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 33, dataCodewordsPerBlock: 16 },
                      { numBlocks: 4, dataCodewordsPerBlock: 17 }
                    ]
                  }
                ]
              },
              {
                infoBits: 110734,
                versionNumber: 27,
                alignmentPatternCenters: [6, 34, 62, 90, 118],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 122 },
                      { numBlocks: 4, dataCodewordsPerBlock: 123 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 22, dataCodewordsPerBlock: 45 },
                      { numBlocks: 3, dataCodewordsPerBlock: 46 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 23 },
                      { numBlocks: 26, dataCodewordsPerBlock: 24 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 15 },
                      { numBlocks: 28, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 117786,
                versionNumber: 28,
                alignmentPatternCenters: [6, 26, 50, 74, 98, 122],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 117 },
                      { numBlocks: 10, dataCodewordsPerBlock: 118 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 45 },
                      { numBlocks: 23, dataCodewordsPerBlock: 46 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 24 },
                      { numBlocks: 31, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 15 },
                      { numBlocks: 31, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 119615,
                versionNumber: 29,
                alignmentPatternCenters: [6, 30, 54, 78, 102, 126],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 116 },
                      { numBlocks: 7, dataCodewordsPerBlock: 117 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 21, dataCodewordsPerBlock: 45 },
                      { numBlocks: 7, dataCodewordsPerBlock: 46 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 23 },
                      { numBlocks: 37, dataCodewordsPerBlock: 24 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 15 },
                      { numBlocks: 26, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 126325,
                versionNumber: 30,
                alignmentPatternCenters: [6, 26, 52, 78, 104, 130],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 115 },
                      { numBlocks: 10, dataCodewordsPerBlock: 116 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 47 },
                      { numBlocks: 10, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 24 },
                      { numBlocks: 25, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 23, dataCodewordsPerBlock: 15 },
                      { numBlocks: 25, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 127568,
                versionNumber: 31,
                alignmentPatternCenters: [6, 30, 56, 82, 108, 134],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 13, dataCodewordsPerBlock: 115 },
                      { numBlocks: 3, dataCodewordsPerBlock: 116 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 46 },
                      { numBlocks: 29, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 42, dataCodewordsPerBlock: 24 },
                      { numBlocks: 1, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 23, dataCodewordsPerBlock: 15 },
                      { numBlocks: 28, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 133589,
                versionNumber: 32,
                alignmentPatternCenters: [6, 34, 60, 86, 112, 138],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 115 }]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 46 },
                      { numBlocks: 23, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 24 },
                      { numBlocks: 35, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 15 },
                      { numBlocks: 35, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 136944,
                versionNumber: 33,
                alignmentPatternCenters: [6, 30, 58, 86, 114, 142],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 115 },
                      { numBlocks: 1, dataCodewordsPerBlock: 116 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 14, dataCodewordsPerBlock: 46 },
                      { numBlocks: 21, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 29, dataCodewordsPerBlock: 24 },
                      { numBlocks: 19, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 15 },
                      { numBlocks: 46, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 141498,
                versionNumber: 34,
                alignmentPatternCenters: [6, 34, 62, 90, 118, 146],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 13, dataCodewordsPerBlock: 115 },
                      { numBlocks: 6, dataCodewordsPerBlock: 116 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 14, dataCodewordsPerBlock: 46 },
                      { numBlocks: 23, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 44, dataCodewordsPerBlock: 24 },
                      { numBlocks: 7, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 59, dataCodewordsPerBlock: 16 },
                      { numBlocks: 1, dataCodewordsPerBlock: 17 }
                    ]
                  }
                ]
              },
              {
                infoBits: 145311,
                versionNumber: 35,
                alignmentPatternCenters: [6, 30, 54, 78, 102, 126, 150],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 121 },
                      { numBlocks: 7, dataCodewordsPerBlock: 122 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 47 },
                      { numBlocks: 26, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 39, dataCodewordsPerBlock: 24 },
                      { numBlocks: 14, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 22, dataCodewordsPerBlock: 15 },
                      { numBlocks: 41, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 150283,
                versionNumber: 36,
                alignmentPatternCenters: [6, 24, 50, 76, 102, 128, 154],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 121 },
                      { numBlocks: 14, dataCodewordsPerBlock: 122 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 47 },
                      { numBlocks: 34, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 46, dataCodewordsPerBlock: 24 },
                      { numBlocks: 10, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 15 },
                      { numBlocks: 64, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 152622,
                versionNumber: 37,
                alignmentPatternCenters: [6, 28, 54, 80, 106, 132, 158],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 122 },
                      { numBlocks: 4, dataCodewordsPerBlock: 123 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 29, dataCodewordsPerBlock: 46 },
                      { numBlocks: 14, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 49, dataCodewordsPerBlock: 24 },
                      { numBlocks: 10, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 24, dataCodewordsPerBlock: 15 },
                      { numBlocks: 46, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 158308,
                versionNumber: 38,
                alignmentPatternCenters: [6, 32, 58, 84, 110, 136, 162],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 122 },
                      { numBlocks: 18, dataCodewordsPerBlock: 123 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 13, dataCodewordsPerBlock: 46 },
                      { numBlocks: 32, dataCodewordsPerBlock: 47 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 48, dataCodewordsPerBlock: 24 },
                      { numBlocks: 14, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 42, dataCodewordsPerBlock: 15 },
                      { numBlocks: 32, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 161089,
                versionNumber: 39,
                alignmentPatternCenters: [6, 26, 54, 82, 110, 138, 166],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 20, dataCodewordsPerBlock: 117 },
                      { numBlocks: 4, dataCodewordsPerBlock: 118 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 40, dataCodewordsPerBlock: 47 },
                      { numBlocks: 7, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 43, dataCodewordsPerBlock: 24 },
                      { numBlocks: 22, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 15 },
                      { numBlocks: 67, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              },
              {
                infoBits: 167017,
                versionNumber: 40,
                alignmentPatternCenters: [6, 30, 58, 86, 114, 142, 170],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 118 },
                      { numBlocks: 6, dataCodewordsPerBlock: 119 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 18, dataCodewordsPerBlock: 47 },
                      { numBlocks: 31, dataCodewordsPerBlock: 48 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 34, dataCodewordsPerBlock: 24 },
                      { numBlocks: 34, dataCodewordsPerBlock: 25 }
                    ]
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 20, dataCodewordsPerBlock: 15 },
                      { numBlocks: 61, dataCodewordsPerBlock: 16 }
                    ]
                  }
                ]
              }
            ];
          }),
          /* 11 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var BitMatrix_1 = __webpack_require__(0);
            function squareToQuadrilateral(p1, p2, p3, p4) {
              var dx3 = p1.x - p2.x + p3.x - p4.x;
              var dy3 = p1.y - p2.y + p3.y - p4.y;
              if (dx3 === 0 && dy3 === 0) {
                return {
                  a11: p2.x - p1.x,
                  a12: p2.y - p1.y,
                  a13: 0,
                  a21: p3.x - p2.x,
                  a22: p3.y - p2.y,
                  a23: 0,
                  a31: p1.x,
                  a32: p1.y,
                  a33: 1
                };
              } else {
                var dx1 = p2.x - p3.x;
                var dx2 = p4.x - p3.x;
                var dy1 = p2.y - p3.y;
                var dy2 = p4.y - p3.y;
                var denominator = dx1 * dy2 - dx2 * dy1;
                var a13 = (dx3 * dy2 - dx2 * dy3) / denominator;
                var a23 = (dx1 * dy3 - dx3 * dy1) / denominator;
                return {
                  a11: p2.x - p1.x + a13 * p2.x,
                  a12: p2.y - p1.y + a13 * p2.y,
                  a13,
                  a21: p4.x - p1.x + a23 * p4.x,
                  a22: p4.y - p1.y + a23 * p4.y,
                  a23,
                  a31: p1.x,
                  a32: p1.y,
                  a33: 1
                };
              }
            }
            function quadrilateralToSquare(p1, p2, p3, p4) {
              var sToQ = squareToQuadrilateral(p1, p2, p3, p4);
              return {
                a11: sToQ.a22 * sToQ.a33 - sToQ.a23 * sToQ.a32,
                a12: sToQ.a13 * sToQ.a32 - sToQ.a12 * sToQ.a33,
                a13: sToQ.a12 * sToQ.a23 - sToQ.a13 * sToQ.a22,
                a21: sToQ.a23 * sToQ.a31 - sToQ.a21 * sToQ.a33,
                a22: sToQ.a11 * sToQ.a33 - sToQ.a13 * sToQ.a31,
                a23: sToQ.a13 * sToQ.a21 - sToQ.a11 * sToQ.a23,
                a31: sToQ.a21 * sToQ.a32 - sToQ.a22 * sToQ.a31,
                a32: sToQ.a12 * sToQ.a31 - sToQ.a11 * sToQ.a32,
                a33: sToQ.a11 * sToQ.a22 - sToQ.a12 * sToQ.a21
              };
            }
            function times(a, b) {
              return {
                a11: a.a11 * b.a11 + a.a21 * b.a12 + a.a31 * b.a13,
                a12: a.a12 * b.a11 + a.a22 * b.a12 + a.a32 * b.a13,
                a13: a.a13 * b.a11 + a.a23 * b.a12 + a.a33 * b.a13,
                a21: a.a11 * b.a21 + a.a21 * b.a22 + a.a31 * b.a23,
                a22: a.a12 * b.a21 + a.a22 * b.a22 + a.a32 * b.a23,
                a23: a.a13 * b.a21 + a.a23 * b.a22 + a.a33 * b.a23,
                a31: a.a11 * b.a31 + a.a21 * b.a32 + a.a31 * b.a33,
                a32: a.a12 * b.a31 + a.a22 * b.a32 + a.a32 * b.a33,
                a33: a.a13 * b.a31 + a.a23 * b.a32 + a.a33 * b.a33
              };
            }
            function extract(image, location) {
              var qToS = quadrilateralToSquare({ x: 3.5, y: 3.5 }, { x: location.dimension - 3.5, y: 3.5 }, { x: location.dimension - 6.5, y: location.dimension - 6.5 }, { x: 3.5, y: location.dimension - 3.5 });
              var sToQ = squareToQuadrilateral(location.topLeft, location.topRight, location.alignmentPattern, location.bottomLeft);
              var transform = times(sToQ, qToS);
              var matrix = BitMatrix_1.BitMatrix.createEmpty(location.dimension, location.dimension);
              var mappingFunction = function(x2, y2) {
                var denominator = transform.a13 * x2 + transform.a23 * y2 + transform.a33;
                return {
                  x: (transform.a11 * x2 + transform.a21 * y2 + transform.a31) / denominator,
                  y: (transform.a12 * x2 + transform.a22 * y2 + transform.a32) / denominator
                };
              };
              for (var y = 0; y < location.dimension; y++) {
                for (var x = 0; x < location.dimension; x++) {
                  var xValue = x + 0.5;
                  var yValue = y + 0.5;
                  var sourcePixel = mappingFunction(xValue, yValue);
                  matrix.set(x, y, image.get(Math.floor(sourcePixel.x), Math.floor(sourcePixel.y)));
                }
              }
              return {
                matrix,
                mappingFunction
              };
            }
            exports2.extract = extract;
          }),
          /* 12 */
          /***/
          (function(module3, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: true });
            var MAX_FINDERPATTERNS_TO_SEARCH = 4;
            var MIN_QUAD_RATIO = 0.5;
            var MAX_QUAD_RATIO = 1.5;
            var distance = function(a, b) {
              return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
            };
            function sum(values) {
              return values.reduce(function(a, b) {
                return a + b;
              });
            }
            function reorderFinderPatterns(pattern1, pattern2, pattern3) {
              var _a, _b, _c, _d;
              var oneTwoDistance = distance(pattern1, pattern2);
              var twoThreeDistance = distance(pattern2, pattern3);
              var oneThreeDistance = distance(pattern1, pattern3);
              var bottomLeft;
              var topLeft;
              var topRight;
              if (twoThreeDistance >= oneTwoDistance && twoThreeDistance >= oneThreeDistance) {
                _a = [pattern2, pattern1, pattern3], bottomLeft = _a[0], topLeft = _a[1], topRight = _a[2];
              } else if (oneThreeDistance >= twoThreeDistance && oneThreeDistance >= oneTwoDistance) {
                _b = [pattern1, pattern2, pattern3], bottomLeft = _b[0], topLeft = _b[1], topRight = _b[2];
              } else {
                _c = [pattern1, pattern3, pattern2], bottomLeft = _c[0], topLeft = _c[1], topRight = _c[2];
              }
              if ((topRight.x - topLeft.x) * (bottomLeft.y - topLeft.y) - (topRight.y - topLeft.y) * (bottomLeft.x - topLeft.x) < 0) {
                _d = [topRight, bottomLeft], bottomLeft = _d[0], topRight = _d[1];
              }
              return { bottomLeft, topLeft, topRight };
            }
            function computeDimension(topLeft, topRight, bottomLeft, matrix) {
              var moduleSize = (sum(countBlackWhiteRun(topLeft, bottomLeft, matrix, 5)) / 7 + // Divide by 7 since the ratio is 1:1:3:1:1
              sum(countBlackWhiteRun(topLeft, topRight, matrix, 5)) / 7 + sum(countBlackWhiteRun(bottomLeft, topLeft, matrix, 5)) / 7 + sum(countBlackWhiteRun(topRight, topLeft, matrix, 5)) / 7) / 4;
              if (moduleSize < 1) {
                throw new Error("Invalid module size");
              }
              var topDimension = Math.round(distance(topLeft, topRight) / moduleSize);
              var sideDimension = Math.round(distance(topLeft, bottomLeft) / moduleSize);
              var dimension = Math.floor((topDimension + sideDimension) / 2) + 7;
              switch (dimension % 4) {
                case 0:
                  dimension++;
                  break;
                case 2:
                  dimension--;
                  break;
              }
              return { dimension, moduleSize };
            }
            function countBlackWhiteRunTowardsPoint(origin, end, matrix, length) {
              var switchPoints = [{ x: Math.floor(origin.x), y: Math.floor(origin.y) }];
              var steep = Math.abs(end.y - origin.y) > Math.abs(end.x - origin.x);
              var fromX;
              var fromY;
              var toX;
              var toY;
              if (steep) {
                fromX = Math.floor(origin.y);
                fromY = Math.floor(origin.x);
                toX = Math.floor(end.y);
                toY = Math.floor(end.x);
              } else {
                fromX = Math.floor(origin.x);
                fromY = Math.floor(origin.y);
                toX = Math.floor(end.x);
                toY = Math.floor(end.y);
              }
              var dx = Math.abs(toX - fromX);
              var dy = Math.abs(toY - fromY);
              var error = Math.floor(-dx / 2);
              var xStep = fromX < toX ? 1 : -1;
              var yStep = fromY < toY ? 1 : -1;
              var currentPixel = true;
              for (var x = fromX, y = fromY; x !== toX + xStep; x += xStep) {
                var realX = steep ? y : x;
                var realY = steep ? x : y;
                if (matrix.get(realX, realY) !== currentPixel) {
                  currentPixel = !currentPixel;
                  switchPoints.push({ x: realX, y: realY });
                  if (switchPoints.length === length + 1) {
                    break;
                  }
                }
                error += dy;
                if (error > 0) {
                  if (y === toY) {
                    break;
                  }
                  y += yStep;
                  error -= dx;
                }
              }
              var distances = [];
              for (var i = 0; i < length; i++) {
                if (switchPoints[i] && switchPoints[i + 1]) {
                  distances.push(distance(switchPoints[i], switchPoints[i + 1]));
                } else {
                  distances.push(0);
                }
              }
              return distances;
            }
            function countBlackWhiteRun(origin, end, matrix, length) {
              var _a;
              var rise = end.y - origin.y;
              var run = end.x - origin.x;
              var towardsEnd = countBlackWhiteRunTowardsPoint(origin, end, matrix, Math.ceil(length / 2));
              var awayFromEnd = countBlackWhiteRunTowardsPoint(origin, { x: origin.x - run, y: origin.y - rise }, matrix, Math.ceil(length / 2));
              var middleValue = towardsEnd.shift() + awayFromEnd.shift() - 1;
              return (_a = awayFromEnd.concat(middleValue)).concat.apply(_a, towardsEnd);
            }
            function scoreBlackWhiteRun(sequence, ratios) {
              var averageSize = sum(sequence) / sum(ratios);
              var error = 0;
              ratios.forEach(function(ratio, i) {
                error += Math.pow(sequence[i] - ratio * averageSize, 2);
              });
              return { averageSize, error };
            }
            function scorePattern(point, ratios, matrix) {
              try {
                var horizontalRun = countBlackWhiteRun(point, { x: -1, y: point.y }, matrix, ratios.length);
                var verticalRun = countBlackWhiteRun(point, { x: point.x, y: -1 }, matrix, ratios.length);
                var topLeftPoint = {
                  x: Math.max(0, point.x - point.y) - 1,
                  y: Math.max(0, point.y - point.x) - 1
                };
                var topLeftBottomRightRun = countBlackWhiteRun(point, topLeftPoint, matrix, ratios.length);
                var bottomLeftPoint = {
                  x: Math.min(matrix.width, point.x + point.y) + 1,
                  y: Math.min(matrix.height, point.y + point.x) + 1
                };
                var bottomLeftTopRightRun = countBlackWhiteRun(point, bottomLeftPoint, matrix, ratios.length);
                var horzError = scoreBlackWhiteRun(horizontalRun, ratios);
                var vertError = scoreBlackWhiteRun(verticalRun, ratios);
                var diagDownError = scoreBlackWhiteRun(topLeftBottomRightRun, ratios);
                var diagUpError = scoreBlackWhiteRun(bottomLeftTopRightRun, ratios);
                var ratioError = Math.sqrt(horzError.error * horzError.error + vertError.error * vertError.error + diagDownError.error * diagDownError.error + diagUpError.error * diagUpError.error);
                var avgSize = (horzError.averageSize + vertError.averageSize + diagDownError.averageSize + diagUpError.averageSize) / 4;
                var sizeError = (Math.pow(horzError.averageSize - avgSize, 2) + Math.pow(vertError.averageSize - avgSize, 2) + Math.pow(diagDownError.averageSize - avgSize, 2) + Math.pow(diagUpError.averageSize - avgSize, 2)) / avgSize;
                return ratioError + sizeError;
              } catch (_a) {
                return Infinity;
              }
            }
            function recenterLocation(matrix, p) {
              var leftX = Math.round(p.x);
              while (matrix.get(leftX, Math.round(p.y))) {
                leftX--;
              }
              var rightX = Math.round(p.x);
              while (matrix.get(rightX, Math.round(p.y))) {
                rightX++;
              }
              var x = (leftX + rightX) / 2;
              var topY = Math.round(p.y);
              while (matrix.get(Math.round(x), topY)) {
                topY--;
              }
              var bottomY = Math.round(p.y);
              while (matrix.get(Math.round(x), bottomY)) {
                bottomY++;
              }
              var y = (topY + bottomY) / 2;
              return { x, y };
            }
            function locate(matrix) {
              var finderPatternQuads = [];
              var activeFinderPatternQuads = [];
              var alignmentPatternQuads = [];
              var activeAlignmentPatternQuads = [];
              var _loop_1 = function(y2) {
                var length_1 = 0;
                var lastBit = false;
                var scans = [0, 0, 0, 0, 0];
                var _loop_2 = function(x2) {
                  var v = matrix.get(x2, y2);
                  if (v === lastBit) {
                    length_1++;
                  } else {
                    scans = [scans[1], scans[2], scans[3], scans[4], length_1];
                    length_1 = 1;
                    lastBit = v;
                    var averageFinderPatternBlocksize = sum(scans) / 7;
                    var validFinderPattern = Math.abs(scans[0] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize && Math.abs(scans[1] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize && Math.abs(scans[2] - 3 * averageFinderPatternBlocksize) < 3 * averageFinderPatternBlocksize && Math.abs(scans[3] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize && Math.abs(scans[4] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize && !v;
                    var averageAlignmentPatternBlocksize = sum(scans.slice(-3)) / 3;
                    var validAlignmentPattern = Math.abs(scans[2] - averageAlignmentPatternBlocksize) < averageAlignmentPatternBlocksize && Math.abs(scans[3] - averageAlignmentPatternBlocksize) < averageAlignmentPatternBlocksize && Math.abs(scans[4] - averageAlignmentPatternBlocksize) < averageAlignmentPatternBlocksize && v;
                    if (validFinderPattern) {
                      var endX_1 = x2 - scans[3] - scans[4];
                      var startX_1 = endX_1 - scans[2];
                      var line = { startX: startX_1, endX: endX_1, y: y2 };
                      var matchingQuads = activeFinderPatternQuads.filter(function(q) {
                        return startX_1 >= q.bottom.startX && startX_1 <= q.bottom.endX || endX_1 >= q.bottom.startX && startX_1 <= q.bottom.endX || startX_1 <= q.bottom.startX && endX_1 >= q.bottom.endX && (scans[2] / (q.bottom.endX - q.bottom.startX) < MAX_QUAD_RATIO && scans[2] / (q.bottom.endX - q.bottom.startX) > MIN_QUAD_RATIO);
                      });
                      if (matchingQuads.length > 0) {
                        matchingQuads[0].bottom = line;
                      } else {
                        activeFinderPatternQuads.push({ top: line, bottom: line });
                      }
                    }
                    if (validAlignmentPattern) {
                      var endX_2 = x2 - scans[4];
                      var startX_2 = endX_2 - scans[3];
                      var line = { startX: startX_2, y: y2, endX: endX_2 };
                      var matchingQuads = activeAlignmentPatternQuads.filter(function(q) {
                        return startX_2 >= q.bottom.startX && startX_2 <= q.bottom.endX || endX_2 >= q.bottom.startX && startX_2 <= q.bottom.endX || startX_2 <= q.bottom.startX && endX_2 >= q.bottom.endX && (scans[2] / (q.bottom.endX - q.bottom.startX) < MAX_QUAD_RATIO && scans[2] / (q.bottom.endX - q.bottom.startX) > MIN_QUAD_RATIO);
                      });
                      if (matchingQuads.length > 0) {
                        matchingQuads[0].bottom = line;
                      } else {
                        activeAlignmentPatternQuads.push({ top: line, bottom: line });
                      }
                    }
                  }
                };
                for (var x = -1; x <= matrix.width; x++) {
                  _loop_2(x);
                }
                finderPatternQuads.push.apply(finderPatternQuads, activeFinderPatternQuads.filter(function(q) {
                  return q.bottom.y !== y2 && q.bottom.y - q.top.y >= 2;
                }));
                activeFinderPatternQuads = activeFinderPatternQuads.filter(function(q) {
                  return q.bottom.y === y2;
                });
                alignmentPatternQuads.push.apply(alignmentPatternQuads, activeAlignmentPatternQuads.filter(function(q) {
                  return q.bottom.y !== y2;
                }));
                activeAlignmentPatternQuads = activeAlignmentPatternQuads.filter(function(q) {
                  return q.bottom.y === y2;
                });
              };
              for (var y = 0; y <= matrix.height; y++) {
                _loop_1(y);
              }
              finderPatternQuads.push.apply(finderPatternQuads, activeFinderPatternQuads.filter(function(q) {
                return q.bottom.y - q.top.y >= 2;
              }));
              alignmentPatternQuads.push.apply(alignmentPatternQuads, activeAlignmentPatternQuads);
              var finderPatternGroups = finderPatternQuads.filter(function(q) {
                return q.bottom.y - q.top.y >= 2;
              }).map(function(q) {
                var x = (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4;
                var y2 = (q.top.y + q.bottom.y + 1) / 2;
                if (!matrix.get(Math.round(x), Math.round(y2))) {
                  return;
                }
                var lengths = [q.top.endX - q.top.startX, q.bottom.endX - q.bottom.startX, q.bottom.y - q.top.y + 1];
                var size = sum(lengths) / lengths.length;
                var score = scorePattern({ x: Math.round(x), y: Math.round(y2) }, [1, 1, 3, 1, 1], matrix);
                return { score, x, y: y2, size };
              }).filter(function(q) {
                return !!q;
              }).sort(function(a, b) {
                return a.score - b.score;
              }).map(function(point, i, finderPatterns) {
                if (i > MAX_FINDERPATTERNS_TO_SEARCH) {
                  return null;
                }
                var otherPoints = finderPatterns.filter(function(p, ii) {
                  return i !== ii;
                }).map(function(p) {
                  return { x: p.x, y: p.y, score: p.score + Math.pow(p.size - point.size, 2) / point.size, size: p.size };
                }).sort(function(a, b) {
                  return a.score - b.score;
                });
                if (otherPoints.length < 2) {
                  return null;
                }
                var score = point.score + otherPoints[0].score + otherPoints[1].score;
                return { points: [point].concat(otherPoints.slice(0, 2)), score };
              }).filter(function(q) {
                return !!q;
              }).sort(function(a, b) {
                return a.score - b.score;
              });
              if (finderPatternGroups.length === 0) {
                return null;
              }
              var _a = reorderFinderPatterns(finderPatternGroups[0].points[0], finderPatternGroups[0].points[1], finderPatternGroups[0].points[2]), topRight = _a.topRight, topLeft = _a.topLeft, bottomLeft = _a.bottomLeft;
              var alignment = findAlignmentPattern(matrix, alignmentPatternQuads, topRight, topLeft, bottomLeft);
              var result = [];
              if (alignment) {
                result.push({
                  alignmentPattern: { x: alignment.alignmentPattern.x, y: alignment.alignmentPattern.y },
                  bottomLeft: { x: bottomLeft.x, y: bottomLeft.y },
                  dimension: alignment.dimension,
                  topLeft: { x: topLeft.x, y: topLeft.y },
                  topRight: { x: topRight.x, y: topRight.y }
                });
              }
              var midTopRight = recenterLocation(matrix, topRight);
              var midTopLeft = recenterLocation(matrix, topLeft);
              var midBottomLeft = recenterLocation(matrix, bottomLeft);
              var centeredAlignment = findAlignmentPattern(matrix, alignmentPatternQuads, midTopRight, midTopLeft, midBottomLeft);
              if (centeredAlignment) {
                result.push({
                  alignmentPattern: { x: centeredAlignment.alignmentPattern.x, y: centeredAlignment.alignmentPattern.y },
                  bottomLeft: { x: midBottomLeft.x, y: midBottomLeft.y },
                  topLeft: { x: midTopLeft.x, y: midTopLeft.y },
                  topRight: { x: midTopRight.x, y: midTopRight.y },
                  dimension: centeredAlignment.dimension
                });
              }
              if (result.length === 0) {
                return null;
              }
              return result;
            }
            exports2.locate = locate;
            function findAlignmentPattern(matrix, alignmentPatternQuads, topRight, topLeft, bottomLeft) {
              var _a;
              var dimension;
              var moduleSize;
              try {
                _a = computeDimension(topLeft, topRight, bottomLeft, matrix), dimension = _a.dimension, moduleSize = _a.moduleSize;
              } catch (e) {
                return null;
              }
              var bottomRightFinderPattern = {
                x: topRight.x - topLeft.x + bottomLeft.x,
                y: topRight.y - topLeft.y + bottomLeft.y
              };
              var modulesBetweenFinderPatterns = (distance(topLeft, bottomLeft) + distance(topLeft, topRight)) / 2 / moduleSize;
              var correctionToTopLeft = 1 - 3 / modulesBetweenFinderPatterns;
              var expectedAlignmentPattern = {
                x: topLeft.x + correctionToTopLeft * (bottomRightFinderPattern.x - topLeft.x),
                y: topLeft.y + correctionToTopLeft * (bottomRightFinderPattern.y - topLeft.y)
              };
              var alignmentPatterns = alignmentPatternQuads.map(function(q) {
                var x = (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4;
                var y = (q.top.y + q.bottom.y + 1) / 2;
                if (!matrix.get(Math.floor(x), Math.floor(y))) {
                  return;
                }
                var lengths = [q.top.endX - q.top.startX, q.bottom.endX - q.bottom.startX, q.bottom.y - q.top.y + 1];
                var size = sum(lengths) / lengths.length;
                var sizeScore = scorePattern({ x: Math.floor(x), y: Math.floor(y) }, [1, 1, 1], matrix);
                var score = sizeScore + distance({ x, y }, expectedAlignmentPattern);
                return { x, y, score };
              }).filter(function(v) {
                return !!v;
              }).sort(function(a, b) {
                return a.score - b.score;
              });
              var alignmentPattern = modulesBetweenFinderPatterns >= 15 && alignmentPatterns.length ? alignmentPatterns[0] : expectedAlignmentPattern;
              return { alignmentPattern, dimension };
            }
          })
          /******/
        ])["default"]
      );
    });
  }
});

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  RemoteWorkspaceRows: () => RemoteWorkspaceRows,
  SessionFolderControls: () => SessionFolderControls,
  SessionNavigation: () => SessionNavigation,
  WorkspaceGroups: () => WorkspaceGroups,
  WorkspaceSetBrowser: () => WorkspaceSetBrowser,
  WorkspaceSetsEditor: () => WorkspaceSetsEditor,
  apply: () => apply,
  completeOpenRouterRedirect: () => completeOpenRouterRedirect,
  decorateAutoPermissionIcons: () => decorateAutoPermissionIcons,
  hasUsage: () => hasUsage,
  inject: () => inject,
  mergeWorkspaceGroup: () => mergeWorkspaceGroup,
  name: () => name,
  navigateSession: () => navigateSession,
  sessionNavigationState: () => sessionNavigationState
});
module.exports = __toCommonJS(client_exports);

// src/client.css
var client_default = '.darask {\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  padding: 20px 0;\n  max-width: 920px;\n  margin: 0 auto;\n}\n.darask *, .darask *::before, .darask *::after { box-sizing: border-box; }\n.darask-workspace-groups { display: grid; gap: 16px; margin-bottom: 24px; }\n.darask-workspace-group { min-width: 0; }\n.darask .darask-workspace-group h3 { margin-bottom: 8px; font-size: 13px; font-weight: 600; }\n.darask-workspace-group h3 span { font-size: 11px; font-weight: 400; }\n.darask-workspace-entry button { display: grid; justify-items: start; gap: 3px; width: 100%; padding: 8px 10px; text-align: left; border: .5px solid var(--dsw-alias-border-l2); border-radius: 8px; margin-top: 4px; font: inherit; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); cursor: pointer; }\n.darask-workspace-entry button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }\n.darask-workspace-entry button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }\n.darask-workspace-entry button:disabled { cursor: default; }\n.darask-workspace-entry strong { font-size: 13px; overflow-wrap: anywhere; display: inline-flex; align-items: center; gap: 6px; }\n.darask-workspace-entry small { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }\n.darask-unified-workspace-list { overflow-y: auto !important; scrollbar-gutter: stable; }\n.darask-local-workspaces { flex: none; min-width: 0; }\n.darask-local-workspaces .darask-native-workspace-tree, .darask-local-workspaces .darask-native-workspace-list { flex: none; overflow: visible; }\n.darask-local-workspaces .darask-native-workspace-list { padding-bottom: 4px; scrollbar-gutter: auto; }\n.darask-local-workspaces .darask-native-workspace-fade { display: none; }\n.darask.darask-workspaces-sidebar { padding: 0 var(--dsh-sidebar-inline-padding, 12px) 12px 0; margin: 0; width: 100%; flex: none; }\n.darask-remote-workspaces { display: grid; gap: 4px; min-width: 0; }\n.darask-remote-workspaces:empty { display: none; }\n.darask-workspace-row { display: flex; align-items: center; min-width: 0; border-radius: 8px; min-height: 36px; }\n.darask-workspace-row:hover, .darask-workspace-row[data-active] { background: var(--dsw-alias-interactive-bg-hover); }\n.darask-workspace-row button { border: 0; color: var(--dsw-alias-label-primary); background: transparent; font: inherit; cursor: pointer; border-radius: 8px; }\n.darask-workspace-row button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }\n.darask-workspace-globe { width: 34px; height: 34px; padding: 0; flex: none; }\n.darask-workspace-globe:hover, .darask-workspace-globe[aria-expanded=true] { background: var(--dsw-alias-interactive-bg-hover); }\n.darask-workspace-action { flex: none; width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; line-height: 1; color: var(--dsw-alias-label-secondary) !important; }\n.darask-workspace-action:hover { background: var(--dsw-alias-interactive-bg-hover); }\n.darask-workspace-row > span, .darask-session-row > span { display: inline-flex; align-items: center; align-self: center; }\n.darask-workspace-dialog { padding: 4px 0; display: grid; gap: 16px; }\n.darask-workspace-title { flex: 1; min-width: 0; padding: 8px 8px 8px 0; text-align: left; font-size: 13px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.darask-workspace-info { display: grid; gap: 4px; margin: 2px 4px 6px 32px; padding: 10px; background: var(--dsw-alias-bg-layer-2); border: .5px solid var(--dsw-alias-border-l2); border-radius: 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; overflow-wrap: anywhere; }\n.darask-workspace-info strong { color: var(--dsw-alias-label-primary); }\n.darask-workspace-sessions { display: grid; gap: 2px; margin-left: 28px; }\n.darask-session-row { display: flex; align-items: center; min-width: 0; gap: 2px; }\n.darask-session-status { width: 16px; height: 28px; flex: none; display: inline-flex; justify-content: center; align-items: center; position: relative; }\n.darask-session-error { display: flex; align-items: center; justify-content: center; width: 10px; height: 10px; font-size: 12px; font-weight: 700; line-height: 1; color: var(--dsw-alias-state-error-primary); }\n.darask-visually-hidden { clip: rect(0 0 0 0); white-space: nowrap; width: 1px; height: 1px; position: absolute; overflow: hidden; }\n.darask-session-navigation { position: fixed; right: max(14px, env(safe-area-inset-right)); top: 50%; z-index: 40; display: grid; gap: 3px; padding: 4px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-2); box-shadow: 0 4px 18px #0002; transform: translateY(-50%); }\n.darask-session-navigation button { width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 8px; color: var(--dsw-alias-label-secondary); background: transparent; font: inherit; font-size: 18px; line-height: 1; cursor: pointer; }\n.darask-session-navigation button:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }\n.darask-session-navigation button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }\n@media (max-width: 600px) { .darask-session-navigation { right: max(6px, env(safe-area-inset-right)); } .darask-session-navigation button { width: 30px; height: 30px; } }\n.darask-session-title { flex: 1; }\n.darask-session-row .darask-workspace-action { flex: 0 0 28px; padding: 0; }\n.darask-workspace-sessions .darask-session-title { display: block; min-width: 0; padding: 7px 10px; font: inherit; font-size: 13px; text-align: left; color: var(--dsw-alias-label-secondary); background: transparent; border: 0; border-radius: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }\n.darask-workspace-sessions .darask-session-title:hover, .darask-workspace-sessions .darask-session-title[aria-current] { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }\n.darask-workspace-sessions .darask-session-title:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }\n.darask-main-stack { position: relative; width: 100%; height: 100%; flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; }\n.darask-workspace-pool { position: absolute; inset: 0; }\n.darask-workspace-pool[hidden] { display: block; visibility: hidden; pointer-events: none; }\n.darask-workspace-main { position: absolute; inset: 0; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }\n.darask-workspace-main[hidden] { display: flex; visibility: hidden; pointer-events: none; }\n.darask-workspace-main:not([hidden]) { z-index: 1; }\n.darask-workspace-main iframe { border: 0; width: 100%; flex: 1; min-height: 0; }\n.darask-workspace-status { padding: 24px; font: inherit; font-size: 14px; }\n.darask h2, .darask h3, .darask p { margin: 0; }\n.darask-heading, .darask-line, .darask-provider-header, .darask-routing, .darask-footer { display: flex; align-items: center; gap: 12px; }\n.darask-heading { justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }\n.darask-heading h2 { font-size: 20px; font-weight: 600; line-height: 1.5; }\n.darask-heading p, .darask-routing p, .darask-section-heading p { margin-top: 6px; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }\n.darask-heading > button { flex: none; }\n.darask-routing { justify-content: space-between; padding: 16px; background: var(--dsw-alias-bg-layer-3); border: .5px solid var(--dsw-alias-border-l4); border-radius: 16px; margin-bottom: 24px; }\n.darask-routing strong { font-size: 14px; font-weight: 600; }\n.darask-purpose-routing { margin-bottom: 24px; padding: 16px; background: var(--dsw-alias-bg-layer-3); border: .5px solid var(--dsw-alias-border-l4); border-radius: 16px; }\n.darask-purpose-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }\n.darask-jev { margin-bottom: 24px; background: var(--dsw-alias-bg-layer-3); border: .5px solid var(--dsw-alias-border-l4); border-radius: 16px; overflow: hidden; }\n.darask-section-heading { margin-bottom: 14px; }\n.darask-section-heading h3 { font-size: 15px; font-weight: 600; }\n.darask-provider-list { display: grid; gap: 12px; }\n.darask-integrations { display: grid; gap: 12px; margin-top: 24px; }\n.darask-provider { background: var(--dsw-alias-bg-layer-3); border: .5px solid var(--dsw-alias-border-l4); border-radius: 16px; overflow: hidden; }\n.darask-provider-header { padding: 14px 16px; flex-wrap: wrap; }\n.darask-rank { width: 24px; height: 24px; display: grid; place-items: center; flex: none; border: .5px solid var(--dsw-alias-border-l4); border-radius: 8px; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }\n.darask-provider-name { flex: 1; min-width: 100px; overflow-wrap: anywhere; }\n.darask-provider-name h3 { font-size: 15px; font-weight: 600; line-height: 1.4; }\n.darask-provider-name .darask-meta { display: block; margin-top: 4px; }\n.darask-move { display: flex; gap: 2px; }\n.darask-move button { min-width: 28px; padding-inline: 6px; }\n.darask-usage { margin: 0 16px; padding: 0 0 14px; display: grid; gap: 12px; }\n.darask-window { display: grid; gap: 6px; }\n.darask-line { justify-content: space-between; font-size: 13px; line-height: 1.5; }\n.darask-line strong { font-weight: 500; font-variant-numeric: tabular-nums; }\n.darask-progress { display: block; border: none; width: 100%; height: 5px; border-radius: 3px; overflow: hidden; appearance: none; background: var(--dsw-alias-border-l2); accent-color: var(--dsw-alias-brand-primary); }\n.darask-progress::-webkit-progress-bar { background: var(--dsw-alias-border-l2); border-radius: 3px; }\n.darask-progress::-webkit-progress-value { background: var(--dsw-alias-brand-primary); border-radius: 3px; }\n.darask-progress::-moz-progress-bar { background: var(--dsw-alias-brand-primary); border-radius: 3px; }\n.darask-progress-low { accent-color: var(--dsw-alias-label-error); }\n.darask-progress-low::-webkit-progress-value, .darask-progress-low::-moz-progress-bar { background: var(--dsw-alias-label-error); }\n.darask-meta, .darask-muted, .darask-credit-hint { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }\n.darask-sources { display: flex; gap: 12px; justify-content: space-between; flex-wrap: wrap; }\n.darask-credit { padding-block: 4px; }\n.darask-details { border-top: .5px solid var(--dsw-alias-border-l2); margin: 0 16px; }\n.darask-details summary { padding: 12px 0; cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 13px; }\n.darask-details summary:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: 4px; }\n.darask-fields { padding: 0 0 16px; display: grid; gap: 16px; }\n.darask button[role="switch"] { width: 58px !important; height: 30px !important; padding: 3px !important; border: 2px solid var(--dsw-alias-border-l2) !important; border-radius: 15px !important; background: var(--dsw-alias-bg-layer-1) !important; box-shadow: inset 0 1px 2px #0002; transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease; }\n.darask button[role="switch"]::before { content: "OFF"; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); color: var(--dsw-alias-label-secondary); font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: .04em; }\n.darask button[role="switch"] > span { width: 20px !important; height: 20px !important; background: var(--dsw-alias-label-secondary) !important; box-shadow: 0 1px 3px #0004; transition: transform 140ms ease, background 140ms ease !important; }\n.darask button[role="switch"][aria-checked="true"] { border-color: var(--dsw-alias-brand-primary) !important; background: var(--dsw-alias-brand-primary) !important; box-shadow: inset 0 1px 2px #0003, 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); }\n.darask button[role="switch"][aria-checked="true"]::before { content: "ON"; left: 7px; right: auto; color: var(--dsw-alias-label-primary-foreground); }\n.darask button[role="switch"][aria-checked="true"] > span { transform: translateX(28px) !important; background: var(--dsw-alias-label-primary-foreground) !important; }\n.darask button[role="switch"]:hover:not(:disabled) { border-color: var(--dsw-alias-brand-primary) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); }\n.darask button[role="switch"]:focus-visible { outline: 3px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent) !important; outline-offset: 3px !important; }\n.darask button[role="switch"]:disabled { opacity: .5; filter: grayscale(.35); cursor: not-allowed; }\n.darask-bitwarden-guide { padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }\n.darask-bitwarden-guide summary { cursor: pointer; color: var(--dsw-alias-label-primary); font-weight: 600; }\n.darask-bitwarden-guide ol { margin: 10px 0; padding-left: 22px; display: grid; gap: 6px; line-height: 1.6; }\n.darask-bitwarden-guide code { display: block; padding: 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); white-space: pre-wrap; overflow-wrap: anywhere; user-select: all; }\n.darask-bitwarden-guide code + code { margin-top: 6px; }\n.darask-bitwarden-guide a { display: inline-block; margin-top: 10px; color: var(--dsw-alias-brand-primary); text-decoration: underline; text-underline-offset: 3px; }\n.darask-bitwarden-overview { margin-bottom: 14px; }\n@media (prefers-reduced-motion: reduce) { .darask button[role="switch"], .darask button[role="switch"] > span { transition: none !important; } }\n.darask-model-visibility { display: grid; gap: 10px; padding: 12px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 10px; }\n.darask-model-visibility > strong { font-size: 13px; font-weight: 600; }\n.darask-model-visibility-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }\n.darask-model-visibility-row > span { min-width: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; overflow-wrap: anywhere; }\n.darask-model-visibility-row > button { flex: none; }\n.darask-model-visibility > small { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 1.6; }\n.darask-actions { display: flex; flex-wrap: wrap; gap: 6px; }\n.darask-local-runtime { display: grid; gap: 10px; }\n.darask-field { display: grid; gap: 8px; font-size: 13px; }\n.darask-field > span:first-child { color: var(--dsw-alias-label-secondary); }\n.darask-field > span:not(:first-child) { width: 100%; }\n.darask-field input { width: 100%; min-width: 0; }\n.darask-field small { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }\n.darask-key-row { grid-template-columns: auto 1fr; align-items: start; gap: 10px; }\n.darask-key-row input[type="checkbox"] { width: 16px; height: 16px; margin-top: 2px; accent-color: var(--dsw-alias-brand-primary); }\n.darask-key-row > span { color: var(--dsw-alias-label-primary); display: grid; gap: 2px; overflow-wrap: anywhere; }\n.darask-login { padding: 12px; border: .5px solid var(--dsw-alias-border-l4); border-radius: 12px; background: var(--dsw-alias-bg-layer-2); display: grid; gap: 8px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }\n.darask-login code { font-size: 16px; user-select: all; }\n.darask-login a { color: var(--dsw-alias-brand-primary); text-decoration: underline; text-underline-offset: 3px; width: fit-content; }\n.darask-error { border: .5px solid var(--dsw-alias-label-error); color: var(--dsw-alias-label-error); border-radius: 12px; padding: 12px; margin-bottom: 16px; display: flex; gap: 12px; justify-content: space-between; align-items: center; font-size: 13px; overflow-wrap: anywhere; }\n.darask-warning { border: .5px solid var(--dsw-alias-label-error); color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border-radius: 12px; padding: 12px; display: grid; gap: 8px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }\n.darask-warning strong { color: var(--dsw-alias-label-error); font-weight: 600; }\n.darask-warning a { color: var(--dsw-alias-brand-primary); text-decoration: underline; text-underline-offset: 3px; width: fit-content; }\n.darask-credit-hint { margin-top: 14px !important; }\n.darask-compatibility { margin-top: 18px; padding: 14px 16px; border: .5px solid var(--dsw-alias-border-l4); border-radius: 12px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }\n.darask-compatibility strong { font-weight: 600; }\n.darask-compatibility p { margin-top: 6px; overflow-wrap: anywhere; }\n.darask-footer { position: sticky; bottom: 0; justify-content: flex-end; margin-top: 20px; padding: 14px 0; background: var(--dsw-alias-bg-layer-2); border-top: .5px solid var(--dsw-alias-border-l2); z-index: 1; }\n.darask-footer > span { margin-right: auto; font-size: 12px; color: var(--dsw-alias-label-tertiary); }\n@media (max-width: 600px) {\n  .darask { padding-block: 16px; }\n  .darask-heading { flex-direction: column; gap: 12px; }\n  .darask-provider-header { gap: 8px; padding-inline: 12px; }\n  .darask-provider-name { min-width: 96px; }\n  .darask-usage, .darask-details { margin-inline: 12px; }\n  .darask-card-section { padding-inline: 12px; }\n  .darask-move { order: 5; margin-left: auto; }\n  .darask-move button { min-height: 36px; min-width: 36px; }\n  .darask-actions button { min-height: 36px; }\n  .darask-footer { gap: 6px; flex-wrap: wrap; }\n}\n.darask-json { width: 100%; box-sizing: border-box; font: inherit; color: inherit; background: transparent; border: 1px solid var(--dsh-border-color, #8885); border-radius: 8px; padding: 12px; resize: vertical; }\n.darask-account-actions { display: grid; gap: 12px; margin: 0 16px 14px; }\n.darask-provider-sections { display: grid; }\n.darask-card-section { padding: 14px 16px 16px; }\n.darask-card-section:first-child { padding-top: 0; }\n.darask-card-section + .darask-card-section { border-top: .5px solid var(--dsw-alias-border-l2); }\n.darask-card-section-title { margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }\n.darask-card-section-body { display: grid; gap: 12px; }\n.darask-jev-inline { display: grid; gap: 12px; margin-top: 4px; padding-top: 16px; border-top: .5px solid var(--dsw-alias-border-l2); }\n.darask-jev-inline .darask-line > div { display: grid; gap: 3px; }\n.darask-usage-sidebar { width: 100%; min-width: 0; color: var(--dsw-alias-label-primary); }\n.darask-usage-trigger { width: 100%; display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; border: 0; border-radius: 8px; cursor: pointer; text-align: left; }\n.darask-usage-trigger:hover { background: var(--dsw-alias-interactive-bg-hover); }\n.darask-usage-trigger:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }\n.darask-usage-sidebar[data-wide="false"] .darask-usage-trigger { width: 28px; height: 28px; padding: 6px; }\n.darask-usage-summary { display: grid; gap: 5px; padding: 0 2px 6px; max-height: min(32vh, 280px); overflow-y: auto; scrollbar-width: thin; }\n.darask-usage-summary .darask-provider { border-radius: 8px; }\n.darask-usage-summary .darask-provider-header { padding: 5px 8px 3px; gap: 4px; }\n.darask-usage-summary .darask-provider-header h3 { font-size: 11px; font-weight: 600; line-height: 1.25; }\n.darask-usage-summary .dsw-tag, .darask-usage-summary [class*="Tag"] { font-size: 9px; padding: 0 5px; min-height: 16px; }\n.darask-usage-summary .darask-usage { margin: 0 8px; padding-bottom: 6px; gap: 4px; }\n.darask-usage-summary .darask-window { gap: 2px; }\n.darask-usage-summary .darask-progress { height: 3px; }\n.darask-usage-summary .darask-line { font-size: 10px; line-height: 1.3; gap: 4px; align-items: baseline; }\n.darask-usage-summary .darask-line strong { text-align: right; overflow-wrap: anywhere; }\n.darask-usage-summary .darask-meta, .darask-usage-summary .darask-muted { font-size: 9px; line-height: 1.35; }\n.darask-usage-full { display: grid; gap: 10px; padding: 0; }\n.darask-usage-full > button { justify-self: end; }\n.darask-usage-modal { width: min(700px, 94vw); max-height: 88dvh; overflow-y: auto; }\n.darask select { width: 100%; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; }\n.darask select option { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }\n.darask-pc-form { display: grid; gap: 16px; padding: 16px; }\n.darask-folder-list { display: grid; max-height: 220px; overflow-y: auto; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 6px; }\n.darask-folder-list button { font: inherit; font-size: 13px; text-align: left; color: var(--dsw-alias-label-primary); background: transparent; border: 0; border-radius: 6px; padding: 8px; cursor: pointer; overflow-wrap: anywhere; }\n.darask-folder-list button:hover { background: var(--dsw-alias-interactive-bg-hover); }\n.darask-qr-actions { display: grid; gap: 14px; padding: 18px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; margin-block: 16px; background: var(--dsw-alias-bg-layer-2); }\n.darask-qr-panel { display: grid; gap: 18px; padding: 0; }\n.darask-qr-heading { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }\n.darask-qr-card { margin: 0 auto; width: min(100%, 384px); box-sizing: border-box; padding: 12px 12px 20px; border: 1px solid #e4e8ec; border-radius: 18px; background: #fff; color: #12202c; text-align: center; }\n.darask-qr-card img { display: block; width: 100%; height: auto; border-radius: 0; }\n.darask-qr-card figcaption { font-size: 12px; font-weight: 500; overflow-wrap: anywhere; color: #12202c; }\n.darask-qr-download { display: inline-flex; align-items: center; padding: 6px 12px; color: var(--dsw-alias-brand-primary); text-decoration: underline; text-underline-offset: 3px; font-size: 13px; }\n.darask-qr-camera { display: block; width: 100%; max-height: 360px; background: #12202c; border-radius: 14px; object-fit: contain; }\n.darask-account-tabs { display: flex; gap: 6px; flex-wrap: wrap; padding-block: 4px 18px; border-bottom: 1px solid var(--dsw-alias-border-l2); margin-bottom: 20px; }\n.darask-account-panel[hidden] { display: none; }\n.darask textarea { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 10px; font: inherit; width: 100%; resize: vertical; }\n.darask textarea:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }\n.darask-account-panel .darask-integrations { display: grid; gap: 14px; }\n.darask-account-panel .darask-integrations > h3 { margin-top: 20px; }\n.darask-pc-manual > summary { padding: 14px 16px; cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 13px; }\n.darask-source-path { overflow-wrap: anywhere; user-select: all; }\n.darask-codex-accounts { display: grid; gap: 12px; }\n.darask-codex-account { border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; padding: 14px; display: grid; gap: 10px; }\n.darask-codex-heading { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }\n.darask-codex-account .darask-usage { margin: 0; }\n.darask-codex-callback summary { cursor: pointer; padding-block: 8px; }\n.darask-codex-callback form { display: grid; gap: 10px; }\n.darask-git-diff { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 26rem; overflow: auto; font-size: .8rem; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-3); padding: 1rem; }\n.darask-kanban { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 12px 0 20px; }\n.darask-kanban-column { background: var(--dsw-alias-bg-layer-3); border: .5px solid var(--dsw-alias-border-l4); border-radius: 12px; padding: 12px; display: grid; gap: 8px; align-content: start; }\n.darask-kanban-column h3 { font-size: 13px; font-weight: 600; }\n.darask-kanban-card { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); font-size: 13px; display: grid; gap: 4px; }\n.darask-kanban-card small { color: var(--dsw-alias-label-tertiary); font-size: 11px; }\n.darask-addon-extra { display: grid; gap: 12px; margin-top: 24px; }\n.darask-addon-extra h3 { font-size: 15px; font-weight: 600; }\n.darask-restart-row { border-bottom: .5px solid var(--dsw-alias-border-l2); align-items: center; gap: 12px; padding: 16px 0; display: flex; }\n.darask-restart-row > div { flex-direction: column; flex: 1; gap: 4px; min-width: 0; display: flex; }\n.darask-restart-row strong { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 400; line-height: 22px; }\n.darask-restart-row p { color: var(--dsw-alias-label-tertiary); font-size: 12px; font-weight: 400; line-height: 18px; margin: 0; }\n\n.darask-archive-list { display: grid; gap: 12px; }\n.darask-archive-list .darask-actions { flex: none; }\n.darask-set-root { border: 1px solid var(--border-color, currentColor); border-radius: 8px; padding: 12px; display: grid; gap: 8px; }\n.darask-set-preview { color: inherit; background: transparent; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 440px; overflow: auto; padding: 8px; border: 1px solid var(--border-color, currentColor); }\n.darask-set-tab { padding: 12px; overflow: auto; height: 100%; }\n.darask-set-browser { padding: 8px 0; }\n\n.darask-auto-permission-icon {\n  display: inline-flex;\n  flex: none;\n  width: 16px;\n  height: 16px;\n  align-items: center;\n  justify-content: center;\n  color: var(--dsw-alias-label-tertiary, currentColor);\n}\n.darask-auto-permission-icon svg { width: 16px; height: 16px; display: block; }\nbutton[aria-label*="\u81EA\u52D5"] > .darask-auto-permission-icon {\n  width: 14px;\n  height: 14px;\n  color: inherit;\n}\nbutton[aria-label*="\u81EA\u52D5"] > .darask-auto-permission-icon svg { width: 14px; height: 14px; }\n';

// src/locales/grok-ja.mjs
var grok_ja_default = {
  nav: "Grok Build",
  title: "Grok Build",
  description: "Grok Build \u306E\u30ED\u30B0\u30A4\u30F3\u3001\u5229\u7528\u67A0\u3001\u4F7F\u7528\u53EF\u80FD\u306A\u30E2\u30C7\u30EB\u3092\u7BA1\u7406\u3057\u307E\u3059\u3002\u8A8D\u8A3C\u60C5\u5831\u306F\u3053\u306E\u753B\u9762\u306B\u9001\u4FE1\u3057\u307E\u305B\u3093\u3002",
  loopback: "\u30A2\u30AB\u30A6\u30F3\u30C8\u7BA1\u7406\u306F\u672C\u6A5F\u306E\u753B\u9762\u304B\u3089\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
  loading: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
  unavailable: "\u30A2\u30AB\u30A6\u30F3\u30C8\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  ready: "\u30ED\u30B0\u30A4\u30F3\u6E08\u307F",
  notReady: "\u672A\u30ED\u30B0\u30A4\u30F3",
  driverMissing: "\u516C\u5F0F CLI \u306E\u30ED\u30B0\u30A4\u30F3\u6A5F\u80FD\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093",
  running: "\u30ED\u30B0\u30A4\u30F3\u4E2D",
  succeeded: "\u30ED\u30B0\u30A4\u30F3\u3057\u307E\u3057\u305F",
  failed: "\u30ED\u30B0\u30A4\u30F3\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  cancelled: "\u30ED\u30B0\u30A4\u30F3\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F",
  cliMissingTitle: "Grok Build CLI \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
  cliMissingBody: "\u516C\u5F0F\u30AC\u30A4\u30C9\u306B\u5F93\u3063\u3066 Grok Build CLI \u3092\u5C0E\u5165\u3057\u3001\u518D\u691C\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  cliInvalidTitle: "Grok Build CLI \u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093",
  cliInvalidBody: "\u65E2\u5B9A\u306E CLI \u304C\u30D0\u30FC\u30B8\u30E7\u30F3\u307E\u305F\u306F\u5B89\u5168\u6027\u306E\u78BA\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u516C\u5F0F\u914D\u5E03\u5143\u304B\u3089\u66F4\u65B0\u30FB\u518D\u5C0E\u5165\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  diagnosticsUnavailableTitle: "Grok Build CLI \u3092\u691C\u51FA\u3067\u304D\u307E\u305B\u3093",
  diagnosticsUnavailableBody: "\u672C\u6A5F\u306E CLI \u3092\u691C\u51FA\u3067\u304D\u307E\u305B\u3093\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u518D\u691C\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  officialInstall: "\u516C\u5F0F\u306E\u5C0E\u5165\u30AC\u30A4\u30C9",
  redetect: "\u518D\u691C\u51FA",
  providerVersion: "\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u30D0\u30FC\u30B8\u30E7\u30F3",
  cliVersion: "Grok Build \u306E\u30D0\u30FC\u30B8\u30E7\u30F3",
  versionUnknown: "\u4E0D\u660E",
  cliNotDetected: "\u672A\u691C\u51FA",
  cliUnavailable: "\u5229\u7528\u4E0D\u53EF",
  authNetworkTimeout: "\u30ED\u30B0\u30A4\u30F3\u30B5\u30FC\u30D3\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093",
  authNetworkTimeoutBody: "xAI \u306E\u8A8D\u8A3C\u30B5\u30FC\u30D3\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u306A\u3044\u305F\u3081\u3001\u30D6\u30E9\u30A6\u30B6\u8A8D\u8A3C\u306F\u59CB\u307E\u3063\u3066\u3044\u307E\u305B\u3093\u3002\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30FB\u30D7\u30ED\u30AD\u30B7\u30FB\u30D5\u30A1\u30A4\u30A2\u30A6\u30A9\u30FC\u30EB\u30FBVPN \u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  loginTimeout: "\u30ED\u30B0\u30A4\u30F3\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F",
  loginTimeoutBody: "\u516C\u5F0F CLI \u304C 5 \u5206\u4EE5\u5185\u306B\u30D6\u30E9\u30A6\u30B6\u8A8D\u8A3C\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u8A8D\u8A3C\u5F8C\u306E\u623B\u308A\u5148\u3092\u78BA\u8A8D\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  cliFailedBody: "\u516C\u5F0F Grok Build CLI \u306E\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u7AEF\u672B\u3067 grok login --oauth \u3092\u5B9F\u884C\u3057\u3066\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  runningBody: "xAI \u306E\u8A8D\u8A3C\u30B5\u30FC\u30D3\u30B9\u306B\u63A5\u7D9A\u3057\u3066\u3044\u307E\u3059\u3002\u516C\u5F0F CLI \u304C\u8A8D\u8A3C URL \u3092\u4F5C\u6210\u3059\u308B\u3068\u30D6\u30E9\u30A6\u30B6\u304C\u958B\u304D\u307E\u3059\u3002\u9014\u4E2D\u3067\u4E2D\u6B62\u3067\u304D\u307E\u3059\u3002",
  login: "\u30D6\u30E9\u30A6\u30B6\u3067\u30ED\u30B0\u30A4\u30F3",
  cancel: "\u30ED\u30B0\u30A4\u30F3\u3092\u4E2D\u6B62",
  logout: "\u30ED\u30B0\u30A2\u30A6\u30C8",
  confirmLogout: "\u3082\u3046\u4E00\u5EA6\u62BC\u3059\u3068\u30ED\u30B0\u30A2\u30A6\u30C8",
  officialBody: "\u8A8D\u8A3C\u3068\u8CC7\u683C\u60C5\u5831\u306E\u66F4\u65B0\u306F\u672C\u6A5F\u306E\u516C\u5F0F Grok CLI \u304C\u884C\u3044\u307E\u3059\u3002\u518D\u30ED\u30B0\u30A4\u30F3\u306F\u5171\u6709\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u7F6E\u304D\u63DB\u3048\u3001\u30ED\u30B0\u30A2\u30A6\u30C8\u306F\u540C\u3058\u8CC7\u683C\u60C5\u5831\u3092\u4F7F\u3046\u4ED6\u306E\u30A2\u30D7\u30EA\u306B\u3082\u53CD\u6620\u3055\u308C\u307E\u3059\u3002",
  usage: "\u5229\u7528\u67A0",
  grokBuild: "Grok Build",
  refresh: "\u66F4\u65B0",
  refreshing: "\u66F4\u65B0\u4E2D\u2026",
  weekly: "\u9031\u9593\u306E\u5229\u7528\u67A0",
  monthly: "\u6708\u9593\u306E\u5229\u7528\u67A0",
  currentPeriod: "\u73FE\u5728\u306E\u5229\u7528\u671F\u9593",
  remaining: "\u6B8B\u308A",
  used: "\u4F7F\u7528\u6E08\u307F",
  resetTime: "\u30EA\u30BB\u30C3\u30C8\u65E5\u6642",
  resetUnknown: "\u30EA\u30BB\u30C3\u30C8\u65E5\u6642\u306F\u672A\u63D0\u4F9B\u3067\u3059",
  usageUnknown: "\u5229\u7528\u7387\u306F\u672A\u63D0\u4F9B\u3067\u3059",
  quotaUnavailable: "Grok Build \u306E\u5229\u7528\u67A0\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  searchTitle: "\u30AA\u30F3\u30E9\u30A4\u30F3\u691C\u7D22",
  searchDescription: "\u521D\u671F\u72B6\u614B\u3067\u306F\u7121\u52B9\u3067\u3059\u3002\u901A\u5E38\u306E Grok \u30EA\u30AF\u30A8\u30B9\u30C8\u304B\u3089 xAI \u306E\u691C\u7D22\u3092\u4F7F\u3046\u304B\u500B\u5225\u306B\u8A2D\u5B9A\u3057\u307E\u3059\u3002\u5BFE\u5FDC\u3059\u308B\u30E2\u30C7\u30EB\u306F grok-4.6 \u306E\u307F\u3067\u3059\u3002\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u306E\u8981\u7D04\u3084\u4F1A\u8A71\u30BF\u30A4\u30C8\u30EB\u3067\u306F\u4F7F\u3044\u307E\u305B\u3093\u3002",
  webSearch: "\u30A6\u30A7\u30D6\u691C\u7D22",
  webSearchDescription: "\u4F1A\u8A71\u3084\u751F\u6210\u3057\u305F\u691C\u7D22\u8A9E\u3092\u4F7F\u3044\u3001xAI \u304C\u516C\u958B\u30A6\u30A7\u30D6\u30DA\u30FC\u30B8\u3092\u691C\u7D22\u3057\u307E\u3059\u3002\u8FFD\u52A0\u306E\u4F7F\u7528\u91CF\u304C\u767A\u751F\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002",
  xSearch: "X \u691C\u7D22",
  xSearchDescription: "\u4F1A\u8A71\u3084\u751F\u6210\u3057\u305F\u691C\u7D22\u8A9E\u3092\u4F7F\u3044\u3001xAI \u304C X \u306E\u6295\u7A3F\u30FB\u30E6\u30FC\u30B6\u30FC\u30FB\u4F1A\u8A71\u3092\u691C\u7D22\u3057\u307E\u3059\u3002\u8FFD\u52A0\u306E\u4F7F\u7528\u91CF\u304C\u767A\u751F\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002",
  searchRisk: "\u691C\u7D22\u7D50\u679C\u3084\u5F15\u7528\u306B\u306F\u8AA4\u308A\u3084\u4E0D\u6B63\u306A\u6307\u793A\u304C\u542B\u307E\u308C\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u91CD\u8981\u306A\u64CD\u4F5C\u306E\u524D\u306B\u51FA\u5178\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u30D7\u30E9\u30B0\u30A4\u30F3\u306F\u5F15\u7528\u5148\u3092\u81EA\u52D5\u3067\u958B\u3044\u305F\u308A\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u305F\u308A\u3057\u307E\u305B\u3093\u3002",
  searchEnabled: "\u6709\u52B9",
  searchDisabled: "\u7121\u52B9",
  searchLoading: "\u691C\u7D22\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026",
  searchUnavailable: "\u691C\u7D22\u8A2D\u5B9A\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u73FE\u5728\u306E\u5024\u3092\u78BA\u8A8D\u3067\u304D\u308B\u307E\u3067\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002",
  searchReadOnly: "\u691C\u7D22\u8A2D\u5B9A\u306F\u8AAD\u307F\u53D6\u308A\u5C02\u7528\u3067\u3059\u3002",
  searchSaveFailed: "\u691C\u7D22\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u73FE\u5728\u306E\u8A2D\u5B9A\u3092\u7DAD\u6301\u3057\u3066\u3044\u307E\u3059\u3002",
  modelsTitle: "\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u4F7F\u3048\u308B\u30E2\u30C7\u30EB",
  modelsDescription: "Grok Build \u306E\u6700\u65B0\u30E2\u30C7\u30EB\u4E00\u89A7\u3067\u3059\u3002\u3053\u3053\u306B\u8868\u793A\u3055\u308C\u305F\u30E2\u30C7\u30EB\u306F DSH \u306E\u30E2\u30C7\u30EB\u9078\u629E\u306B\u3082\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
  modelsUnavailable: "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  noModels: "\u4F7F\u7528\u53EF\u80FD\u306A\u30E2\u30C7\u30EB\u304C\u8FD4\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  context: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8",
  reasoning: "\u63A8\u8AD6\u306E\u5F37\u3055",
  defaultEffort: "\u65E2\u5B9A",
  text: "\u30C6\u30AD\u30B9\u30C8\u5165\u529B",
  image: "\u753B\u50CF\u5165\u529B",
  streaming: "\u9010\u6B21\u51FA\u529B",
  tools: "\u30C4\u30FC\u30EB\u547C\u51FA\u3057",
  lastUpdated: "\u66F4\u65B0\u65E5\u6642"
};

// src/locales/codex-ja.mjs
var codex_ja_default = {
  title: "Codex Connect",
  modelsProviderName: "OpenAI Codex",
  modelsProviderSupport: "Codex Connect \u30D7\u30E9\u30B0\u30A4\u30F3\u3067\u63A5\u7D9A\u3057\u307E\u3059\u3002",
  intro: "ChatGPT \u306E\u5951\u7D04\u3067 DSH \u3092\u4F7F\u3044\u307E\u3059\u3002API \u30AD\u30FC\u306F\u4E0D\u8981\u3067\u3059\u3002GPT Image \u306E\u753B\u50CF\u751F\u6210\u3082\u4EFB\u610F\u3067\u5229\u7528\u3067\u304D\u307E\u3059\u3002",
  accountHeading: "ChatGPT \u30A2\u30AB\u30A6\u30F3\u30C8",
  manageAccount: "\u7BA1\u7406",
  manageAccounts: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u7BA1\u7406",
  hideAccounts: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u96A0\u3059",
  addAccount: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u8FFD\u52A0",
  savedAccounts: "\u4FDD\u5B58\u6E08\u307F\u30A2\u30AB\u30A6\u30F3\u30C8",
  currentAccount: "\u4F7F\u7528\u4E2D",
  currentAccountDetail: "\u73FE\u5728\u306E\u30A2\u30AB\u30A6\u30F3\u30C8",
  savedAccountDetail: "\u4FDD\u5B58\u6E08\u307F\u30A2\u30AB\u30A6\u30F3\u30C8",
  useAccount: "\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u4F7F\u3046",
  usingAccount: "\u4F7F\u7528\u4E2D",
  removeAccount: "\u524A\u9664",
  signOutAll: "\u5168\u30A2\u30AB\u30A6\u30F3\u30C8\u304B\u3089\u30ED\u30B0\u30A2\u30A6\u30C8",
  activeAccountHelp: "\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u5909\u66F4\u306F\u65B0\u3057\u3044 Codex \u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u9069\u7528\u3055\u308C\u307E\u3059\u3002\u5B9F\u884C\u4E2D\u306E\u51E6\u7406\u306F\u7DAD\u6301\u3057\u307E\u3059\u3002",
  addingAccountKeepsCurrent: "\u30D6\u30E9\u30A6\u30B6\u8A8D\u8A3C\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u3002\u65B0\u3057\u3044\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u306F\u73FE\u5728\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u5F15\u304D\u7D9A\u304D\u4F7F\u3044\u307E\u3059\u3002",
  removeAccountTitle: "\u300C{name}\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F",
  removeAccountCopy: "\u672C\u6A5F\u306E\u8A8D\u8A3C\u60C5\u5831\u3092\u524A\u9664\u3057\u307E\u3059\u3002\u4ED6\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u305B\u3093\u3002",
  removeActiveAccountCopy: "\u672C\u6A5F\u306E\u8A8D\u8A3C\u60C5\u5831\u3092\u524A\u9664\u3057\u3001\u300C{name}\u300D\u3092\u73FE\u5728\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u3057\u307E\u3059\u3002",
  removeLastAccountCopy: "\u6700\u5F8C\u306E\u4FDD\u5B58\u6E08\u307F\u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u3059\u3002\u524A\u9664\u3059\u308B\u3068 Codex Connect \u304B\u3089\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3059\u3002",
  cancel: "\u4E2D\u6B62",
  confirmRemove: "\u524A\u9664\u3059\u308B",
  authorize: "\u8A8D\u8A3C",
  continueAuthorization: "\u8A8D\u8A3C\u3092\u7D9A\u3051\u308B",
  reauthorize: "\u518D\u8A8D\u8A3C",
  viewQuota: "\u5229\u7528\u67A0\u3092\u8868\u793A",
  hideQuota: "\u5229\u7528\u67A0\u3092\u96A0\u3059",
  moreSettings: "\u8A73\u7D30\u8A2D\u5B9A",
  moreSettingsTitle: "Codex Connect \u306E\u8A2D\u5B9A",
  closeSettings: "\u9589\u3058\u308B",
  settingsSaveHint: "\u4FDD\u5B58\u3059\u308B\u3068\u4E21\u65B9\u306E\u8A2D\u5B9A\u6B04\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002\u9589\u3058\u308B\u3068\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u3092\u7834\u68C4\u3057\u307E\u3059\u3002",
  reopenAuthorization: "\u8A8D\u8A3C\u753B\u9762\u3092\u958B\u304D\u76F4\u3059",
  cancelSignIn: "\u30ED\u30B0\u30A4\u30F3\u3092\u4E2D\u6B62",
  authorizationHelp: "\u8A8D\u8A3C\u753B\u9762\u3092\u958B\u304D\u76F4\u3059\u304B\u3001\u4E2D\u6B62\u3057\u3066\u3084\u308A\u76F4\u305B\u307E\u3059\u3002\u4E2D\u6B62\u3057\u3066\u3082\u65E2\u5B58\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u305B\u3093\u3002",
  manualCallbackToggle: "\u623B\u308A\u5148 URL \u3067\u8A8D\u8A3C\u3092\u5B8C\u4E86",
  manualCallbackHelp: "\u5225\u306E\u7AEF\u672B\u3067\u8A8D\u8A3C\u3057\u305F\u5834\u5408\u3001DSH \u304C\u305D\u306E\u7AEF\u672B\u3067\u52D5\u3044\u3066\u3044\u306A\u3044\u305F\u3081 localhost \u3078\u306E\u63A5\u7D9A\u30A8\u30E9\u30FC\u306B\u306A\u308A\u307E\u3059\u3002\u30A2\u30C9\u30EC\u30B9\u6B04\u306E URL \u5168\u4F53\u3092\u3001\u30AF\u30A8\u30EA\u6587\u5B57\u5217\u3082\u542B\u3081\u3066\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u753B\u9762\u3078\u623B\u3063\u305F\u5834\u5408\u306F\u300C\u8A8D\u8A3C\u3092\u7D9A\u3051\u308B\u300D\u304B\u3089\u518D\u958B\u3067\u304D\u307E\u3059\u3002",
  manualCallbackPrivacy: "URL \u306B\u306F\u4E00\u6642\u7684\u306A\u8A8D\u8A3C\u60C5\u5831\u304C\u542B\u307E\u308C\u307E\u3059\u3002\u3053\u306E\u5165\u529B\u6B04\u4EE5\u5916\u306E\u30C1\u30E3\u30C3\u30C8\u30FB\u30ED\u30B0\u30FB\u753B\u50CF\u3067\u5171\u6709\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u9001\u4FE1\u5F8C\u306B\u5165\u529B\u3092\u6D88\u3057\u3001\u4FDD\u5B58\u3057\u307E\u305B\u3093\u3002",
  manualCallbackLabel: "\u623B\u308A\u5148 URL \u5168\u4F53",
  manualCallbackSubmit: "\u623B\u308A\u5148 URL \u3092\u9001\u4FE1",
  callbackAccepted: "URL \u3092\u53D7\u3051\u4ED8\u3051\u307E\u3057\u305F\u3002\u8A8D\u8A3C\u306E\u5B8C\u4E86\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u2026",
  callbackInvalid: "URL \u307E\u305F\u306F\u8A8D\u8A3C\u72B6\u614B\u304C\u7121\u52B9\u3067\u3059\u3002\u4ECA\u56DE\u306E\u8A8D\u8A3C\u306E URL \u5168\u4F53\u3092\u30B3\u30D4\u30FC\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  callbackNoPending: "\u8A8D\u8A3C\u5F85\u3061\u306E\u51E6\u7406\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u8A8D\u8A3C\u3092\u518D\u958B\u3059\u308B\u304B\u30ED\u30B0\u30A4\u30F3\u3057\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  callbackFailed: "URL \u3092\u9001\u4FE1\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8A66\u884C\u3059\u308B\u304B\u8A8D\u8A3C\u3092\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002",
  callbackUnconfirmed: "\u9001\u4FE1\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u304C\u3001\u53D7\u7406\u3055\u308C\u305F\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u8A8D\u8A3C\u72B6\u614B\u306E\u78BA\u8A8D\u3092\u7D9A\u3051\u3066\u3044\u307E\u3059\u2026",
  modelsAccountHelp: "\u30D7\u30ED\u30AD\u30B7\u30FB\u30E2\u30C7\u30EB\u8868\u793A\u30FB\u691C\u7D22\u30FB\u753B\u50CF\u306E\u8A2D\u5B9A\u306F\u300C\u8A2D\u5B9A \u2192 \u30D7\u30E9\u30B0\u30A4\u30F3 \u2192 Codex Connect\u300D\u307E\u305F\u306F\u6B21\u304B\u3089\u958B\u3051\u307E\u3059\uFF1A",
  expand: "\u8A2D\u5B9A\u3092\u5C55\u958B",
  collapse: "\u8A2D\u5B9A\u3092\u9589\u3058\u308B",
  loadingAccount: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026",
  signedOut: "\u672A\u30ED\u30B0\u30A4\u30F3",
  signingIn: "\u30D6\u30E9\u30A6\u30B6\u8A8D\u8A3C\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u2026",
  signedIn: "\u30ED\u30B0\u30A4\u30F3\u6E08\u307F",
  reauthRequired: "\u518D\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981",
  login: "ChatGPT \u3067\u30ED\u30B0\u30A4\u30F3",
  loginAgain: "\u518D\u30ED\u30B0\u30A4\u30F3",
  logout: "\u30ED\u30B0\u30A2\u30A6\u30C8",
  working: "\u51E6\u7406\u4E2D\u2026",
  retry: "\u518D\u8A66\u884C",
  popupBlocked: "\u30D6\u30E9\u30A6\u30B6\u304C\u8A8D\u8A3C\u753B\u9762\u3092\u30D6\u30ED\u30C3\u30AF\u3057\u307E\u3057\u305F\u3002\u3053\u306E DSH \u30DA\u30FC\u30B8\u306E\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u3092\u8A31\u53EF\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  popupBlockedFallback: "\u8A8D\u8A3C\u753B\u9762\u3092\u81EA\u52D5\u3067\u958B\u3051\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u4E0B\u306E\u30EA\u30F3\u30AF\u304B\u3089\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002",
  openLoginInBrowser: "ChatGPT \u306E\u8A8D\u8A3C\u753B\u9762\u3092\u958B\u304F",
  usageLimits: "\u5229\u7528\u67A0",
  fiveHourLimit: "5 \u6642\u9593\u306E\u5229\u7528\u67A0",
  weeklyLimit: "\u9031\u9593\u306E\u5229\u7528\u67A0",
  hourLimit: "{count} \u6642\u9593\u306E\u5229\u7528\u67A0",
  usageWindow: "\u5229\u7528\u671F\u9593",
  percentRemaining: "\u6B8B\u308A {percent}%",
  resetAt: "\u30EA\u30BB\u30C3\u30C8\uFF1A{time}",
  resetUnavailable: "\u30EA\u30BB\u30C3\u30C8\u65E5\u6642\u306F\u4E0D\u660E",
  composerWeeklyQuota: "Codex \u306E\u9031\u9593\u5229\u7528\u67A0",
  composerFiveHourShort: "5\u6642\u9593",
  composerWeeklyShort: "7\u65E5",
  composerFiveHourQuotaSummary: "Codex \u306E 5 \u6642\u9593\u5229\u7528\u67A0\uFF1A\u6B8B\u308A {percent}%\u3001\u30EA\u30BB\u30C3\u30C8 {time}",
  composerWeeklyQuotaSummary: "Codex \u306E\u9031\u9593\u5229\u7528\u67A0\uFF1A\u6B8B\u308A {percent}%\u3001\u30EA\u30BB\u30C3\u30C8 {time}",
  fastModeEnabledTitle: "\u73FE\u5728\u306F 1.5 \u500D\u901F\u3067\u3059\u3002\u5229\u7528\u67A0\u306E\u6D88\u8CBB\u3082\u5897\u3048\u307E\u3059\u3002\u62BC\u3059\u3068\u6A19\u6E96\u901F\u5EA6\u3078\u623B\u308A\u307E\u3059\u3002",
  fastModeDisabledTitle: "\u73FE\u5728\u306F\u6A19\u6E96\u901F\u5EA6\u3067\u3059\u3002\u62BC\u3059\u3068 1.5 \u500D\u901F\u306B\u3057\u307E\u3059\u3002",
  fastModeLoadingTitle: "\u3053\u306E\u4F1A\u8A71\u306E\u9AD8\u901F\u30E2\u30FC\u30C9\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u3002",
  fastModeUnavailableTitle: "\u3053\u306E\u4F1A\u8A71\u3067\u306F\u9AD8\u901F\u30E2\u30FC\u30C9\u3092\u4F7F\u3048\u307E\u305B\u3093\u3002",
  monthlyLimit: "\u6708\u9593\u30AF\u30EC\u30B8\u30C3\u30C8\u4E0A\u9650",
  exactRemaining: "{limit} \u30AF\u30EC\u30B8\u30C3\u30C8\u306E\u3046\u3061\u6B8B\u308A {remaining}",
  credits: "\u30AF\u30EC\u30B8\u30C3\u30C8",
  unlimited: "\u4E0A\u9650\u306A\u3057",
  available: "\u5229\u7528\u53EF\u80FD",
  quotaUnavailable: "\u5229\u7528\u67A0\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  requestFailed: "OpenAI Codex \u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  remoteOriginTitle: "\u3053\u306E\u30EA\u30E2\u30FC\u30C8\u63A5\u7D9A\u5143\u306F\u672A\u627F\u8A8D\u3067\u3059",
  remoteOriginDescription: "Codex Connect \u306E\u30D6\u30E9\u30A6\u30B6\u8A8D\u8A3C\u306F\u3001\u672C\u6A5F\u306E\u30DA\u30FC\u30B8\u307E\u305F\u306F\u7AEF\u672B\u6240\u6709\u8005\u304C\u660E\u793A\u7684\u306B\u8A31\u53EF\u3057\u305F\u63A5\u7D9A\u5143\u3067\u5229\u7528\u3067\u304D\u307E\u3059\u3002",
  remoteOriginCommandHelp: "DSH \u304C\u52D5\u304F\u7AEF\u672B\u3067\u6B21\u306E\u30B3\u30DE\u30F3\u30C9\u3092\u5B9F\u884C\u3057\u3001\u3053\u306E\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u30DA\u30FC\u30B8\u304B\u3089\u30B3\u30DE\u30F3\u30C9\u3092\u5B9F\u884C\u3059\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\uFF1A",
  remoteOriginCopy: "\u63A5\u7D9A\u5143\u3092\u8A31\u53EF\u3059\u308B\u30B3\u30DE\u30F3\u30C9\u3092\u30B3\u30D4\u30FC",
  remoteOriginCopied: "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
  remoteOriginCopyFailed: "\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30B3\u30DE\u30F3\u30C9\u3092\u624B\u52D5\u3067\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  configurationHeading: "Codex Connect \u306E\u8A2D\u5B9A",
  settingsModules: "\u8A2D\u5B9A\u9805\u76EE",
  accountModule: "\u30A2\u30AB\u30A6\u30F3\u30C8\u30FB\u5229\u7528\u67A0",
  accountModuleSummary: "\u72B6\u614B\uFF1A{status}",
  modelsModule: "\u30E2\u30C7\u30EB",
  networkModule: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF",
  capabilitiesModule: "\u8FFD\u52A0\u6A5F\u80FD",
  modelsModuleDefault: "\u5168\u30E2\u30C7\u30EB\u3092\u8868\u793A",
  modelsModuleSelected: "{count} \u500B\u306E\u30E2\u30C7\u30EB\u3092\u8868\u793A",
  networkModuleDirect: "\u76F4\u63A5\u63A5\u7D9A",
  networkModuleProxy: "\u30D7\u30ED\u30AD\u30B7\u6709\u52B9",
  capabilitiesModuleEnabled: "{count} \u500B\u6709\u52B9",
  modelCatalog: "\u9078\u629E\u6B04\u306B\u8868\u793A\u3059\u308B\u30E2\u30C7\u30EB",
  modelCatalogIntro: "Codex \u306E\u30E2\u30C7\u30EB\u9078\u629E\u6B04\u306B\u8868\u793A\u3059\u308B\u30E2\u30C7\u30EB\u3092\u9078\u3073\u307E\u3059\u3002\u975E\u8868\u793A\u306B\u3057\u3066\u3082\u65E2\u5B58\u306E\u4F1A\u8A71\u3067\u306F\u7D99\u7D9A\u3057\u3066\u4F7F\u3048\u307E\u3059\u3002",
  modelCatalogLoading: "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026",
  modelCatalogFailed: "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  modelContext: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8",
  contextDefault: "\u30E2\u30C7\u30EB\u4E00\u89A7\u306E\u65E2\u5B9A\u5024",
  contextCustom: "\u30AB\u30B9\u30BF\u30E0",
  contextAdjust: "\u8ABF\u6574",
  contextHide: "\u8ABF\u6574\u6B04\u3092\u96A0\u3059",
  contextTokens: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u9577",
  contextReset: "\u65E2\u5B9A\u5024\u306B\u623B\u3059",
  contextSlider: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u4E0A\u9650\u3092\u8ABF\u6574",
  contextMaximum: "\u8A2D\u5B9A\u53EF\u80FD\u306A\u4E0A\u9650",
  contextLimitSource: "\u53D6\u5F97\u5143\uFF1ACodex \u516C\u5F0F\u8A2D\u5B9A\u4E00\u89A7\uFF082026-09-05\uFF09",
  contextLimitFallback: "\u3053\u308C\u3088\u308A\u5927\u304D\u3044\u8A2D\u5B9A\u4E0A\u9650\u3092\u78BA\u8A8D\u3067\u304D\u306A\u3044\u305F\u3081\u3001\u5C0E\u5165\u6E08\u307F\u30E2\u30C7\u30EB\u306E\u65E2\u5B9A\u5024\u3092\u4E0A\u9650\u3068\u3057\u307E\u3059\u3002",
  contextAboveDefault: "\u65E2\u5B9A\u5024\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002\u5927\u304D\u306A\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u5229\u7528\u67A0\u306E\u6D88\u8CBB\u304C\u5897\u3048\u305F\u308A\u3001\u62D2\u5426\u3055\u308C\u305F\u308A\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u3053\u306E\u7BC4\u56F2\u306E\u5B9F\u884C\u5BB9\u91CF\u306F\u672A\u691C\u8A3C\u3067\u3059\u3002",
  contextWarning: "\u3053\u306E\u8A2D\u5B9A\u306F\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u306E\u51E6\u7406\u91CF\u4E0A\u9650\u3067\u3059\u3002\u30B5\u30FC\u30D0\u30FC\u5BB9\u91CF\u306F\u5909\u308F\u308A\u307E\u305B\u3093\u3002\u5927\u304D\u3059\u304E\u308B\u5024\u3067\u306F\u5931\u6557\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u30E2\u30C7\u30EB\u3092\u96A0\u3057\u3066\u3082\u5024\u3092\u4FDD\u6301\u3057\u3001\u4FDD\u5B58\u5F8C\u306B\u9069\u7528\u3057\u307E\u3059\u3002",
  contextInvalid: "\u8A2D\u5B9A\u53EF\u80FD\u306A\u7BC4\u56F2\u306E\u6574\u6570\u3092\u5165\u529B\u3059\u308B\u304B\u3001\u65E2\u5B9A\u5024\u306B\u623B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  capabilitiesHeading: "\u8FFD\u52A0\u6A5F\u80FD",
  capabilitiesIntro: "\u3053\u306E DSH \u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u3067\u4F7F\u3046 Codex \u306E\u8FFD\u52A0\u6A5F\u80FD\u3092\u9078\u3073\u307E\u3059\u3002",
  networkHeading: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u63A5\u7D9A",
  networkIntro: "\u521D\u671F\u72B6\u614B\u3067\u306F\u76F4\u63A5\u63A5\u7D9A\u3057\u307E\u3059\u3002\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u672C\u6A5F\u306E\u30D7\u30ED\u30AD\u30B7\u3092\u691C\u51FA\u3059\u308B\u304B\u3001\u624B\u52D5\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  currentConnection: "\u73FE\u5728\u306E\u63A5\u7D9A",
  proxyEnabled: "\u30D7\u30ED\u30AD\u30B7\u6709\u52B9",
  directConnection: "\u76F4\u63A5\u63A5\u7D9A",
  directConnectionDescription: "Codex Connect \u5C02\u7528\u306E\u30D7\u30ED\u30AD\u30B7\u306F\u4F7F\u3044\u307E\u305B\u3093\u3002",
  checkCurrentConnection: "\u73FE\u5728\u306E\u63A5\u7D9A\u3092\u78BA\u8A8D",
  checkingCurrentConnectionButton: "\u78BA\u8A8D\u4E2D\u2026",
  checkingCurrentConnection: "\u4FDD\u5B58\u6E08\u307F\u30D7\u30ED\u30AD\u30B7\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
  currentConnectionHealthy: "\u63A5\u7D9A\u3067\u304D\u307E\u3059\u3002",
  currentConnectionFailed: "\u4FDD\u5B58\u6E08\u307F\u30D7\u30ED\u30AD\u30B7\u304B\u3089 Codex \u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  changeConnection: "\u63A5\u7D9A\u65B9\u6CD5\u3092\u5909\u66F4",
  proxyConfigurationMethod: "\u30D7\u30ED\u30AD\u30B7\u306E\u8A2D\u5B9A\u65B9\u6CD5",
  automaticDetection: "\u81EA\u52D5\u691C\u51FA",
  manualEntry: "\u624B\u52D5\u5165\u529B",
  automaticDetectionHelp: "\u4E00\u822C\u7684\u306A\u672C\u6A5F\u306E\u30DD\u30FC\u30C8\u3068\u74B0\u5883\u5909\u6570\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002\u4FDD\u5B58\u6E08\u307F\u63A5\u7D9A\u306F\u5909\u66F4\u3057\u307E\u305B\u3093\u3002",
  scanLocalProxy: "\u672C\u6A5F\u306E\u30D7\u30ED\u30AD\u30B7\u3092\u691C\u51FA",
  manualProxyHelp: "\u8A8D\u8A3C\u60C5\u5831\u30FB\u30D1\u30B9\u30FB\u30AF\u30A8\u30EA\u30FB\u30D5\u30E9\u30B0\u30E1\u30F3\u30C8\u3092\u542B\u307E\u306A\u3044 HTTP(S) \u30D7\u30ED\u30AD\u30B7\u306E\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  proxyCandidateHealthy: "\u63A5\u7D9A\u53EF\u80FD",
  currentProxy: "\u4F7F\u7528\u4E2D",
  selectedProxy: "\u9078\u629E\u6E08\u307F",
  proxyDetectionFailedTitle: "\u4F7F\u7528\u3067\u304D\u308B\u30D7\u30ED\u30AD\u30B7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
  pendingProxy: "\u4FDD\u5B58\u5F8C\u306F {proxyUrl} \u3092\u4F7F\u3044\u307E\u3059\u3002",
  pendingDirect: "\u4FDD\u5B58\u5F8C\u306F\u30D7\u30ED\u30AD\u30B7\u3092\u4F7F\u308F\u305A\u76F4\u63A5\u63A5\u7D9A\u3057\u307E\u3059\u3002",
  customProxyActive: "\u30AB\u30B9\u30BF\u30E0\u30D7\u30ED\u30AD\u30B7\uFF1A{proxyUrl}",
  detectProxy: "\u30D7\u30ED\u30AD\u30B7\u3092\u691C\u51FA",
  detectingProxy: "\u691C\u51FA\u4E2D\u2026",
  configureProxyManually: "\u624B\u52D5\u8A2D\u5B9A",
  disableProxy: "\u30D7\u30ED\u30AD\u30B7\u3092\u7121\u52B9\u5316",
  proxyCandidatesFound: "\u4F7F\u7528\u3067\u304D\u308B\u30D7\u30ED\u30AD\u30B7\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F\u3002\u9069\u7528\u3059\u308B\u3082\u306E\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002",
  keepDirectConnection: "\u76F4\u63A5\u63A5\u7D9A\u3092\u7DAD\u6301",
  useThisProxy: "\u3053\u306E\u30D7\u30ED\u30AD\u30B7\u3092\u4F7F\u3046",
  proxyDetectionFailed: "\u4F7F\u7528\u3067\u304D\u308B\u30D7\u30ED\u30AD\u30B7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002DNS\u30FB\u63A5\u7D9A\u62D2\u5426\u30FB\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u30FBTLS\u30FB\u30D7\u30ED\u30AD\u30B7\u8A8D\u8A3C\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  proxyAddress: "\u30AB\u30B9\u30BF\u30E0\u30D7\u30ED\u30AD\u30B7\u306E\u30A2\u30C9\u30EC\u30B9",
  testProxy: "\u63A5\u7D9A\u3092\u8A66\u3059",
  testingProxy: "\u63A5\u7D9A\u78BA\u8A8D\u4E2D\u2026",
  proxyTestSucceeded: "\u30D7\u30ED\u30AD\u30B7\u304B\u3089 Codex \u306B\u63A5\u7D9A\u3067\u304D\u307E\u3057\u305F\uFF08HTTP {status}\uFF09\u3002",
  proxyTestFailed: "\u63A5\u7D9A\u78BA\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A{reason}\u3002",
  proxyTestRequired: "\u3053\u306E\u30A2\u30C9\u30EC\u30B9\u306E\u63A5\u7D9A\u78BA\u8A8D\u306B\u6210\u529F\u3057\u3066\u304B\u3089\u6709\u52B9\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  invalidProxyUrl: "\u8A8D\u8A3C\u60C5\u5831\u3084\u30D1\u30B9\u3092\u542B\u307E\u306A\u3044 HTTP(S) \u306E\u63A5\u7D9A\u5143\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  enableSearch: "Codex \u691C\u7D22\u3092\u6709\u52B9\u5316",
  enableSearchHelp: "\u6709\u52B9\u306A\u9593\u3001\u3053\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u306E\u30A6\u30A7\u30D6\u691C\u7D22\u306B OpenAI Codex \u3092\u4F7F\u3044\u307E\u3059\u3002",
  searchModel: "\u691C\u7D22\u30E2\u30C7\u30EB",
  searchMode: "\u30A6\u30A7\u30D6\u3078\u306E\u30A2\u30AF\u30BB\u30B9",
  modeCached: "\u30AD\u30E3\u30C3\u30B7\u30E5",
  modeIndexed: "\u7D22\u5F15",
  modeLive: "\u6700\u65B0\u306E\u30A6\u30A7\u30D6",
  searchContextSize: "\u691C\u7D22\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8",
  contextLow: "\u5C0F",
  contextMedium: "\u4E2D",
  contextHigh: "\u5927",
  searchMaxOutputTokens: "\u691C\u7D22\u306E\u6700\u5927\u51FA\u529B\u30C8\u30FC\u30AF\u30F3\u6570",
  enableImageTool: "\u753B\u50CF\u8868\u793A\u30C4\u30FC\u30EB\u3092\u6709\u52B9\u5316",
  enableImageToolHelp: "\u753B\u50CF\u5BFE\u5FDC\u30E2\u30C7\u30EB\u304C\u3001\u8A31\u53EF\u3055\u308C\u305F\u30ED\u30FC\u30AB\u30EB\u753B\u50CF\u3068\u516C\u958B\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306E\u753B\u50CF\u3092\u8AAD\u307F\u53D6\u308C\u308B\u3088\u3046\u306B\u3057\u307E\u3059\u3002",
  enableImageGeneration: "GPT Image \u306E\u753B\u50CF\u751F\u6210\u3092\u6709\u52B9\u5316",
  enableImageGenerationHelp: "GPT \u30E2\u30C7\u30EB\u304C\u4F1A\u8A71\u5185\u3067 GPT Image \u3092\u4F7F\u3063\u3066\u753B\u50CF\u3092\u751F\u6210\u3067\u304D\u307E\u3059\u3002",
  enableReserveFallback: "Luna Reserve \u3078\u306E\u81EA\u52D5\u5207\u66FF",
  enableReserveFallbackHelp: "\u901A\u5E38\u306E\u5229\u7528\u67A0\u3092\u4F7F\u3044\u5207\u308A\u3001\u30B5\u30FC\u30D0\u30FC\u304C\u660E\u793A\u7684\u306B\u8A31\u53EF\u3057\u305F\u5834\u5408\u3060\u3051 Luna Reserve \u3092\u4F7F\u3044\u307E\u3059\u3002\u901A\u5E38\u67A0\u304C\u56DE\u5FA9\u3059\u308B\u3068\u4EE5\u524D\u306E\u30E2\u30C7\u30EB\u306B\u623B\u308A\u307E\u3059\u3002\u5168\u4F53\u306E\u65E2\u5B9A\u5024\u3084\u5229\u7528\u67A0\u306F\u5897\u3084\u3057\u307E\u305B\u3093\u3002",
  imageModelHint: "\u753B\u50CF\u751F\u6210\u30E2\u30C7\u30EB\u306E\u6307\u5B9A",
  imageModelHintDefault: "\u65E2\u5B9A\uFF1Agpt-image-2\u3002\u7A7A\u6B04\u3067\u65E2\u5B9A\u306B\u623B\u3059",
  imageModelHintHelp: "\u4EFB\u610F\u306E\u672A\u691C\u8A3C\u8A2D\u5B9A\u3067\u3059\u3002\u7121\u8996\u30FB\u62D2\u5426\u3055\u308C\u308B\u5834\u5408\u304C\u3042\u308A\u3001\u5B9F\u969B\u306E\u751F\u6210\u30E2\u30C7\u30EB\u3092\u4FDD\u8A3C\u3057\u307E\u305B\u3093\u3002",
  invalidImageModelHint: "\u7A7A\u6B04\u3001\u307E\u305F\u306F\u82F1\u6570\u5B57\u3067\u59CB\u307E\u308B 1\uFF5E128 \u6587\u5B57\u306E\u82F1\u6570\u5B57\u30FB\u70B9\u30FB\u30A2\u30F3\u30C0\u30FC\u30B9\u30B3\u30A2\u30FB\u30CF\u30A4\u30D5\u30F3\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  enableAutoReview: "Codex \u306E\u81EA\u52D5\u627F\u8A8D\u30EC\u30D3\u30E5\u30FC",
  enableAutoReviewHelp: "\u5BFE\u8C61\u306E\u627F\u8A8D\u30EA\u30AF\u30A8\u30B9\u30C8\u3092 Codex \u30EC\u30D3\u30E5\u30A2\u30FC\u3078\u9001\u308A\u307E\u3059\u3002DSH \u306E\u30D5\u30A1\u30A4\u30EB\u30FB\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30FB\u30C4\u30FC\u30EB\u306E\u6A29\u9650\u306F\u62E1\u5F35\u3057\u307E\u305B\u3093\u3002",
  autoReviewOfficialBadge: "Codex \u516C\u5F0F\u6A5F\u80FD",
  autoReviewDetails: "\u9001\u4FE1\u5185\u5BB9\u3068\u5931\u6557\u6642\u306E\u52D5\u4F5C",
  autoReviewDisclosure: "\u76F4\u8FD1\u306E\u4F1A\u8A71\u3001\u95A2\u9023\u30C4\u30FC\u30EB\u306E\u547C\u51FA\u3057\u3068\u7D50\u679C\u3001\u5F15\u6570\u3001\u4F5C\u696D\u30D5\u30A9\u30EB\u30C0\u3001\u4E88\u5B9A\u306E\u64CD\u4F5C\u3092 chatgpt.com \u306B\u9001\u308A\u307E\u3059\u3002\u975E\u516C\u958B\u306E\u63A8\u8AD6\u3084\u4FDD\u5B58\u6E08\u307F\u8A8D\u8A3C\u60C5\u5831\u306F\u9001\u308A\u307E\u305B\u3093\u3002",
  autoReviewFailureDisclosure: "\u30EC\u30D3\u30E5\u30FC\u3092\u5B8C\u4E86\u3067\u304D\u306A\u3044\u5834\u5408\u306F\u4EBA\u306B\u3088\u308B\u627F\u8A8D\u3092\u7DAD\u6301\u3057\u307E\u3059\u3002\u660E\u793A\u7684\u306B\u62D2\u5426\u3055\u308C\u305F\u64CD\u4F5C\u306F\u5B9F\u884C\u3057\u307E\u305B\u3093\u3002",
  autoReviewOfficialDocs: "OpenAI \u306E\u81EA\u52D5\u30EC\u30D3\u30E5\u30FC\u8CC7\u6599",
  autoReviewConfirmTitle: "\u81EA\u52D5\u627F\u8A8D\u30EC\u30D3\u30E5\u30FC\u3092\u6709\u52B9\u306B\u3057\u307E\u3059\u304B\uFF1F",
  autoReviewCancel: "\u4E2D\u6B62",
  autoReviewConfirm: "\u6709\u52B9\u306B\u3059\u308B",
  generating: "\u753B\u50CF\u3092\u751F\u6210\u4E2D",
  generatingDetail: "\u753B\u50CF\u3092\u751F\u6210\u3057\u3066\u3044\u307E\u3059\u3002\u505C\u6B62\u3059\u308B\u3068\u73FE\u5728\u306E\u51E6\u7406\u3092\u4E2D\u6B62\u3057\u307E\u3059\u3002",
  cancelGeneration: "\u3053\u306E\u51E6\u7406\u3092\u505C\u6B62",
  cancelingGeneration: "\u505C\u6B62\u4E2D\u2026",
  promptLabel: "\u753B\u50CF\u751F\u6210\u306B\u4F7F\u3063\u305F\u6307\u793A",
  copyPrompt: "\u6307\u793A\u3092\u30B3\u30D4\u30FC",
  promptCopied: "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
  promptCopyFailed: "\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093",
  completed: "\u753B\u50CF\u3092\u751F\u6210\u3057\u307E\u3057\u305F",
  retryGeneration: "\u518D\u8A66\u884C",
  regenerate: "\u3082\u3046\u4E00\u679A\u751F\u6210",
  editImage: "\u3053\u306E\u753B\u50CF\u3092\u7DE8\u96C6",
  retryRequest: "\u524D\u56DE\u306E\u753B\u50CF\u751F\u6210\u3092\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  regenerateRequest: "\u524D\u56DE\u3068\u540C\u3058\u6307\u793A\u3067\u3082\u3046\u4E00\u679A\u753B\u50CF\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  editRequest: "\u524D\u56DE\u306E\u753B\u50CF\u3092\u7DE8\u96C6\u3057\u307E\u3059\u3002\u751F\u6210\u524D\u306B\u3001\u5909\u66F4\u3057\u305F\u3044\u5185\u5BB9\u3092\u79C1\u306B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  actionSending: "\u9001\u4FE1\u4E2D\u2026",
  actionFailed: "\u8FFD\u52A0\u306E\u6307\u793A\u3092\u9001\u4FE1\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  failed: "\u753B\u50CF\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
  canceled: "\u753B\u50CF\u751F\u6210\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F",
  canceledDetail: "\u672C\u6A5F\u3067\u306E\u5F85\u6A5F\u3092\u505C\u6B62\u3057\u307E\u3057\u305F\u3002\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u307E\u3060\u51E6\u7406\u4E2D\u306E\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002",
  unknownResult: "\u753B\u50CF\u306E\u7D50\u679C\u3092\u5B89\u5168\u306B\u8868\u793A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  imageDetails: "\u753B\u50CF\u306E\u8A73\u7D30",
  imageDetail: "{name}\uFF1A{format} \xB7 {width} \xD7 {height} \xB7 {size}",
  originalImageDetail: "\u5143\u753B\u50CF {name}\uFF1A{format} \xB7 {width} \xD7 {height} \xB7 {size}",
  previewImageDetail: "\u4F1A\u8A71\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\uFF1A{format} \xB7 {width} \xD7 {height} \xB7 {size}",
  download: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  downloadNamed: "{name} \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  downloadOriginal: "\u5143\u753B\u50CF\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  downloadOriginalNamed: "\u5143\u753B\u50CF {name} \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  downloadPreview: "\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  downloadPreviewNamed: "\u30D7\u30EC\u30D3\u30E5\u30FC {name} \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  downloading: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D\u2026",
  downloadFailed: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u518D\u8A66\u884C",
  image: "\u751F\u6210\u753B\u50CF",
  open: "\u753B\u50CF\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u958B\u304F",
  openNamed: "{name} \u3092\u958B\u304F",
  loading: "\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D",
  loadFailed: "\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8A66\u884C",
  lightboxDialog: "\u753B\u50CF\u30D7\u30EC\u30D3\u30E5\u30FC",
  lightboxClose: "\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u9589\u3058\u308B",
  lightboxZoomIn: "\u62E1\u5927",
  lightboxZoomOut: "\u7E2E\u5C0F",
  lightboxReset: "\u753B\u9762\u306B\u5408\u308F\u305B\u308B",
  routingNote: "\u3053\u308C\u3089\u306E\u8A2D\u5B9A\u306F\u65E2\u5B9A\u306E\u30E2\u30C7\u30EB\u3092\u5909\u66F4\u3057\u307E\u305B\u3093\u3002Codex \u691C\u7D22\u306F\u6709\u52B9\u306A\u9593\u3001\u3053\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u306E\u691C\u7D22\u3092\u62C5\u5F53\u3057\u307E\u3059\u3002",
  settingsLoading: "\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026",
  settingsUnavailable: "\u3053\u306E DSH \u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u3067\u306F\u8A2D\u5B9A\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  settingsReadOnly: "\u8A2D\u5B9A\u306F\u8AAD\u307F\u53D6\u308A\u5C02\u7528\u3067\u3059\u3002",
  invalidSearchModel: "\u691C\u7D22\u30E2\u30C7\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  invalidSearchTokens: "\u691C\u7D22\u306E\u6700\u5927\u51FA\u529B\u30C8\u30FC\u30AF\u30F3\u6570\u306F\u6B63\u306E\u6574\u6570\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  save: "\u5909\u66F4\u3092\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  discard: "\u5909\u66F4\u3092\u7834\u68C4",
  settingsSaved: "\u4FDD\u5B58\u3057\u307E\u3057\u305F",
  settingsSaveFailed: "\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5909\u66F4\u5185\u5BB9\u306F\u4FDD\u6301\u3057\u3066\u3044\u307E\u3059\u3002\u518D\u8A66\u884C\u3059\u308B\u304B\u7834\u68C4\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  updateHeading: "Codex Connect \u306E\u66F4\u65B0",
  compatibilityPluginUpdateTitle: "\u5148\u306B Codex Connect \u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044",
  compatibilityPluginUpdateBody: "\u5C0E\u5165\u6E08\u307F\u30D7\u30E9\u30B0\u30A4\u30F3\u306F\u3053\u306E DSH \u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u672A\u691C\u8A3C\u3067\u3059\u304C\u3001\u6700\u65B0\u7248\u306F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002DSH \u3088\u308A\u5148\u306B\u30D7\u30E9\u30B0\u30A4\u30F3\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  compatibilityPluginSame: "Codex Connect\uFF1A{version} \xB7 \u6700\u65B0",
  compatibilityPluginDifferent: "Codex Connect\uFF1A\u73FE\u5728 {current} \xB7 \u6700\u65B0 {latest}",
  compatibilityPluginCurrentOnly: "Codex Connect\uFF1A\u73FE\u5728 {current} \xB7 \u6700\u65B0\u7248\u306F\u53D6\u5F97\u4E0D\u53EF",
  currentVersion: "\u73FE\u5728\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\uFF1A{version}",
  checkForUpdates: "\u66F4\u65B0\u3092\u78BA\u8A8D",
  updateLastChecked: "\u6700\u7D42\u78BA\u8A8D\uFF1A{time}",
  checkingForUpdates: "\u66F4\u65B0\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
  upToDate: "\u5229\u7528\u3067\u304D\u308B\u6700\u65B0\u7248\uFF08{version}\uFF09\u3067\u3059\u3002",
  updateCheckUnavailable: "\u66F4\u65B0\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  newVersionAvailable: "\u65B0\u3057\u3044\u30D0\u30FC\u30B8\u30E7\u30F3\uFF1A{version}",
  whatMatters: "\u4E3B\u306A\u5909\u66F4\u70B9",
  versionSummary: "\u73FE\u5728 {current} \xB7 {count} \u56DE\u306E\u66F4\u65B0\u304C\u3042\u308A\u307E\u3059",
  versionSummaryUnknown: "\u73FE\u5728 {current} \xB7 \u66F4\u65B0\u56DE\u6570\u306F\u4E0D\u660E",
  versionsBehind: "\u73FE\u5728\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u4EE5\u964D\u306B {count} \u56DE\u306E\u66F4\u65B0\u304C\u3042\u308A\u307E\u3059\u3002",
  versionsBehindUnknown: "\u30D0\u30FC\u30B8\u30E7\u30F3\u9593\u306E\u66F4\u65B0\u56DE\u6570\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  noCuratedHighlights: "\u4E3B\u306A\u5909\u66F4\u70B9\u306F\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u66F4\u65B0\u5C65\u6B74\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  updateHighlightTrustedOrigins: "\u30EA\u30E2\u30FC\u30C8\u30D6\u30E9\u30A6\u30B6\u306E\u63A5\u7D9A\u5143\u3092\u660E\u793A\u7684\u306B\u8A31\u53EF\u3067\u304D\u307E\u3059\u3002",
  updateHighlightRuntimeCompatibility: "DSH \u3068 Node.js \u306E\u4E92\u63DB\u6027\u78BA\u8A8D\u30FB\u8A3A\u65AD\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  updateHighlightQuotaFastMode: "\u4F1A\u8A71\u3054\u3068\u306E\u9AD8\u901F\u30E2\u30FC\u30C9\u3068 GPT \u306E\u5229\u7528\u67A0\u30FB\u30EA\u30BB\u30C3\u30C8\u8868\u793A\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  updateHighlightDshRc7: "DSH rc.7 \u306E\u30D7\u30E9\u30B0\u30A4\u30F3\u8868\u793A\u9818\u57DF\u306B\u5BFE\u5FDC\u3057\u307E\u3057\u305F\u3002",
  updateHighlightSearchStability: "\u518D\u8D77\u52D5\u5F8C\u3082\u691C\u7D22\u5C65\u6B74\u3092\u8AAD\u307F\u53D6\u308C\u308B\u3088\u3046\u5B89\u5B9A\u6027\u3092\u6539\u5584\u3057\u307E\u3057\u305F\u3002",
  updateHighlightImageGeneration: "\u4EFB\u610F\u306E GPT Image \u753B\u50CF\u751F\u6210\u3068\u4F1A\u8A71\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  updateHighlightOauthHistory: "\u4F1A\u8A71\u5C65\u6B74\u306E\u79FB\u884C\u3068\u518D\u30ED\u30B0\u30A4\u30F3\u6642\u306E\u51E6\u7406\u3092\u6539\u5584\u3057\u307E\u3057\u305F\u3002",
  updateHighlightModelVisibility: "\u9078\u629E\u6B04\u306B\u8868\u793A\u3059\u308B Codex \u30E2\u30C7\u30EB\u3092\u9078\u3079\u307E\u3059\u3002",
  updateHighlightProxyConnection: "\u4EFB\u610F\u306E\u30D7\u30ED\u30AD\u30B7\u691C\u51FA\u3068\u76F4\u63A5\u63A5\u7D9A\u3078\u306E\u5207\u66FF\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  updateHighlightModelsAccount: "\u30E2\u30C7\u30EB\u8A2D\u5B9A\u306B\u30A2\u30AB\u30A6\u30F3\u30C8\u30FB\u5229\u7528\u67A0\u30FB\u5171\u901A\u8A2D\u5B9A\u306E\u30AB\u30FC\u30C9\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  updateHighlightContextBudget: "\u30E2\u30C7\u30EB\u3054\u3068\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u4E0A\u9650\u3092\u8ABF\u6574\u3067\u304D\u307E\u3059\u3002\u4FDD\u5B58\u3059\u308B\u307E\u3067\u65E2\u5B9A\u5024\u3092\u7DAD\u6301\u3057\u307E\u3059\u3002",
  updateHighlightAutoReviewProbe: "\u81EA\u52D5\u30EC\u30D3\u30E5\u30FC\u3092\u6709\u52B9\u306B\u305B\u305A\u3001\u5229\u7528\u53EF\u80FD\u304B\u8A66\u9A13\u3067\u304D\u307E\u3059\u3002",
  updateHighlightAutoReview: "\u5BFE\u8C61\u306E\u627F\u8A8D\u306B Codex \u81EA\u52D5\u30EC\u30D3\u30E5\u30FC\u3092\u4F7F\u3048\u307E\u3059\u3002\u521D\u56DE\u8AAC\u660E\u3001\u5931\u6557\u6642\u306E\u4EBA\u306B\u3088\u308B\u627F\u8A8D\u3001\u540C\u3058\u64CD\u4F5C\u306E\u518D\u8A66\u884C\u306B\u5BFE\u5FDC\u3057\u307E\u3059\u3002",
  updateHighlightAstraCompatibility: "\u4E0A\u6D41\u306E\u30E2\u30C7\u30EB\u4E00\u89A7\u306B\u306A\u3044\u5834\u5408\u306E GPT-6-Astra \u4E92\u63DB\u6027\u60C5\u5831\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  updateHighlightMultiAccount: "\u8907\u6570\u306E ChatGPT \u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u7BA1\u7406\u3067\u304D\u307E\u3059\u3002\u8A8D\u8A3C\u958B\u59CB\u30FB\u4E2D\u6B62\u3067\u3082\u65E2\u5B58\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u7DAD\u6301\u3057\u307E\u3059\u3002",
  updateHighlightSearchRoute: "Codex \u691C\u7D22\u306E\u6709\u52B9\u5316\u3067\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u306E\u691C\u7D22\u5148\u3092\u5207\u308A\u66FF\u3048\u3001\u7121\u52B9\u5316\u3067\u4EE5\u524D\u306E\u691C\u7D22\u5148\u306B\u623B\u3057\u307E\u3059\u3002",
  updateHighlightImageModelHint: "\u753B\u50CF\u751F\u6210\u30E2\u30C7\u30EB\u306E\u4EFB\u610F\u6307\u5B9A\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002\u6307\u5B9A\u306F\u672A\u691C\u8A3C\u3067\u3001\u5B9F\u969B\u306E\u30E2\u30C7\u30EB\u3092\u4FDD\u8A3C\u3057\u307E\u305B\u3093\u3002",
  updateHighlightLunaReserve: "\u901A\u5E38\u67A0\u306E\u67AF\u6E07\u6642\u306B\u3001\u30B5\u30FC\u30D0\u30FC\u304C\u8A31\u53EF\u3057\u305F\u5834\u5408\u3060\u3051 Luna Reserve \u3092\u4F7F\u3046\u4EFB\u610F\u8A2D\u5B9A\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002",
  viewTechnicalDetails: "\u6280\u8853\u7684\u306A\u8A73\u7D30\u3092\u8868\u793A",
  hideTechnicalDetails: "\u6280\u8853\u7684\u306A\u8A73\u7D30\u3092\u96A0\u3059",
  technicalDetailsHeading: "\u6280\u8853\u7684\u306A\u5909\u66F4",
  viewGithubLink: "GitHub \u3092\u958B\u304F",
  viewFullChangelog: "\u66F4\u65B0\u5C65\u6B74\u3092\u3059\u3079\u3066\u8868\u793A",
  viewReleaseNotes: "\u66F4\u65B0\u5185\u5BB9\u3092\u8868\u793A",
  hideReleaseNotes: "\u66F4\u65B0\u5185\u5BB9\u3092\u96A0\u3059",
  releaseNotesUnavailable: "\u66F4\u65B0\u5185\u5BB9\u306F\u30EA\u30EA\u30FC\u30B9\u30DA\u30FC\u30B8\u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002",
  openReleasePage: "\u30EA\u30EA\u30FC\u30B9\u30DA\u30FC\u30B8\u3092\u958B\u304F",
  copyForAgent: "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u7528\u306E\u6307\u793A\u3092\u30B3\u30D4\u30FC",
  agentPromptCopied: "\u6307\u793A\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
  agentPromptCopyFailed: "\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6307\u793A\u3092\u624B\u52D5\u3067\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  agentUpgradePrompt: "\u3053\u306E\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u3092\u958B\u304D\u3001\u6700\u65B0\u7248\u3092\u78BA\u8A8D\u3057\u3066\u3001\u73FE\u5728\u306E DSH Web \u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u306B\u5BFE\u5FDC\u3059\u308B\u30D7\u30E9\u30B0\u30A4\u30F3\u3092\u5C0E\u5165\u307E\u305F\u306F\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A{repository}",
  agentUpgradeHelp: "\u3053\u306E\u6307\u793A\u3092\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u306B\u6E21\u3059\u3068\u3001\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u624B\u9806\u3092\u78BA\u8A8D\u3057\u3066\u5C0E\u5165\u30FB\u66F4\u65B0\u3067\u304D\u307E\u3059\u3002",
  agentUpgradeFinish: "\u4F5C\u696D\u304C\u5B8C\u4E86\u3057\u305F\u3089\u3001\u3053\u306E\u753B\u9762\u3067\u5C0E\u5165\u6E08\u307F\u30D0\u30FC\u30B8\u30E7\u30F3\u3092\u518D\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  upgradeStepsHeading: "\u66F4\u65B0\u65B9\u6CD5",
  recheckAfterUpgrade: "\u5B8C\u4E86\u3057\u305F\u306E\u3067\u518D\u78BA\u8A8D",
  recheckingAfterUpgrade: "\u66F4\u65B0\u7D50\u679C\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
  upgradeStillAvailable: "\u5B9F\u884C\u4E2D\u306E DSH Web \u306F\u307E\u3060 {version} \u3067\u3059\u3002\u518D\u8D77\u52D5\u3057\u3066\u518D\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  upgradeCheckSuccess: "\u6700\u65B0\u7248\u306B\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F\u3002\u753B\u9762\u304C\u5909\u308F\u3089\u306A\u3044\u5834\u5408\u306F\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  dismissUpdate: "\u5F8C\u3067"
};

// src/workspaces-client.jsx
var import_react4 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/session-activity.mjs
var PENDING = /* @__PURE__ */ new Set(["approval", "plan-review", "question"]);
function sessionActivity(session) {
  if (!session || typeof session !== "object") return null;
  if (PENDING.has(session.pendingInteraction)) return "warning";
  if (session.error === true) return "error";
  if (session.running === true || Number.isInteger(session.runningSubagentCount) && session.runningSubagentCount > 0) return "ongoing";
  if (session.completed === true) return "done";
  return null;
}
function workspaceActivity(sessions) {
  const rank = { warning: 0, error: 1, ongoing: 2, done: 3 };
  let best = null;
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const state = sessionActivity(session);
    if (state && (best === null || rank[state] < rank[best])) best = state;
  }
  return best;
}
function retainCompleted(previous, session) {
  if (!session || session.running === true || Number.isInteger(session.runningSubagentCount) && session.runningSubagentCount > 0) return false;
  if (session.completed === true || previous?.running === true || previous?.completed === true) return true;
  return false;
}
function retainError(previous, session) {
  if (!session || session.running === true) return session.error === true;
  if (session.error === true) return true;
  return previous?.error === true && session.completed !== true;
}
function sessionActivityLabel(state) {
  return { warning: "\u4F5C\u696D\u306E\u8A31\u53EF\u5F85\u3061", error: "\u30A8\u30E9\u30FC", ongoing: "\u4F5C\u696D\u4E2D", done: "\u5B8C\u4E86" }[state] ?? "";
}
function sanitizeRemoteSession(item) {
  if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string") return null;
  const pendingInteraction = PENDING.has(item.pendingInteraction) ? item.pendingInteraction : void 0;
  const runningSubagentCount = Number.isInteger(item.runningSubagentCount) ? Math.min(Math.max(item.runningSubagentCount, 0), 99) : 0;
  return {
    id: item.id,
    title: item.title,
    running: item.running === true,
    completed: item.completed === true,
    error: item.error === true,
    runningSubagentCount,
    ...pendingInteraction ? { pendingInteraction } : {}
  };
}

// src/workspace-sets-client.jsx
var import_react = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
var endpoint = "/api/darask/workspace-sets";
async function request(body, suffix = "", signal) {
  const response = await fetch(endpoint + suffix, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([AbortSignal.timeout(45e3), ...signal ? [signal] : []]), ...body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {} });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002");
  return value;
}
var blank = () => ({ id: crypto.randomUUID(), revision: 0, name: "", roots: [{ node: "local", path: "", label: "" }, { node: "local", path: "", label: "" }] });
function WorkspaceSetBrowser({ set }) {
  const [root, setRoot] = (0, import_react.useState)(set.roots[0]?.id ?? ""), [folder, setFolder] = (0, import_react.useState)(""), [listing, setListing] = (0, import_react.useState)(null), [preview, setPreview] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false);
  const generation = (0, import_react.useRef)(0);
  const active = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => () => active.current?.abort(), []);
  async function load(action, path = "", id = root) {
    const n = ++generation.current;
    active.current?.abort();
    const c = new AbortController();
    active.current = c;
    setBusy(true);
    setError("");
    try {
      const value = await request({ id: set.id, sessionId: set.sessionId, action, root: id, path }, "/browse", c.signal);
      if (n !== generation.current) return;
      if (action === "list") {
        setListing(value);
        setFolder(path);
        setPreview(null);
      } else setPreview({ path, ...value });
    } catch (e) {
      if (!c.signal.aborted) setError(e.message);
    } finally {
      if (n === generation.current) setBusy(false);
    }
  }
  (0, import_react.useEffect)(() => {
    generation.current++;
    active.current?.abort();
    const first = set.roots[0]?.id ?? "";
    setRoot(first);
    setFolder("");
    setListing(null);
    setPreview(null);
    setBusy(false);
  }, [set.id, set.revision]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-set-browser", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u30D5\u30A9\u30EB\u30C0\u30FC" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: root, onChange: (e) => {
        setRoot(e.target.value);
        setFolder("");
        void load("list", "", e.target.value);
      }, children: set.roots.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: r.id, children: [
        r.node === "local" ? "" : "\u{1F310} ",
        r.label,
        " \xB7 ",
        r.pc
      ] }, r.id)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "darask-meta", children: [
      set.roots.find((r) => r.id === root)?.path,
      folder && " / " + folder
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy, onClick: () => void load("list", folder), children: "\u4E00\u89A7\u3092\u8868\u793A\u30FB\u66F4\u65B0" }),
      folder && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy, onClick: () => void load("list", folder.split("/").slice(0, -1).join("/")), children: "\u4E0A\u306E\u968E\u5C64" })
    ] }),
    listing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-folder-list", children: [
      listing.entries.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", disabled: busy || e.type === "other", onClick: () => void load(e.type === "directory" ? "list" : "read", [folder, e.name].filter(Boolean).join("/")), children: [
        e.type === "directory" ? "\u25B8" : "\xB7",
        " ",
        e.name
      ] }, e.name)),
      listing.truncated && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u5148\u982D\u306E 1,000 \u4EF6\u3092\u8868\u793A\u3057\u3066\u3044\u307E\u3059\u3002" })
    ] }),
    preview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: preview.path }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "darask-set-preview", children: preview.exists ? preview.text : "\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "darask-error", children: error })
  ] });
}
function WorkspaceSetsEditor({ data, onPicked }) {
  const [sets, setSets] = (0, import_react.useState)([]), [draft, setDraft] = (0, import_react.useState)(blank), [busy, setBusy] = (0, import_react.useState)(false), [error, setError] = (0, import_react.useState)(""), [message2, setMessage] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    const c = new AbortController();
    request(null, "", c.signal).then((v) => setSets(v.sets)).catch((e) => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, []);
  const update = (index, patch) => setDraft((s) => ({ ...s, roots: s.roots.map((r, i) => i === index ? { ...r, ...patch } : r) }));
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await request({ action: "save", ...draft });
      setSets(result.sets);
      setDraft(blank());
      setMessage("\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u30B5\u30A4\u30C9\u30D0\u30FC\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u304B\u3089\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u8FFD\u52A0\u3067\u304D\u307E\u3059\u3002");
      window.dispatchEvent(new Event("darask-workspaces-changed"));
      onPicked?.(result.set.cwd);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(set) {
    setBusy(true);
    setError("");
    try {
      const result = await request({ action: "remove", id: set.id, revision: set.revision });
      setSets(result.sets);
      window.dispatchEvent(new Event("darask-workspaces-changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "darask-integrations", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8907\u6570\u30D5\u30A9\u30EB\u30C0\u30FC\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "darask-muted", children: "\u7570\u306A\u308B PC\u30FB\u30C9\u30E9\u30A4\u30D6\u306E\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u4E00\u3064\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u304B\u3089\u6271\u3048\u307E\u3059\u3002\u5143\u306E\u30D5\u30A9\u30EB\u30C0\u30FC\u3001Git \u5C65\u6B74\u3001\u65E2\u5B58\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306F\u305D\u306E\u307E\u307E\u6B8B\u308A\u307E\u3059\u3002" }),
    sets.map((set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
        set.roots.some((r) => r.node !== "local") ? "\u{1F310} " : "",
        set.name,
        " \xB7 ",
        set.roots.length,
        " \u30D5\u30A9\u30EB\u30C0\u30FC"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: set.roots.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        r.node !== "local" ? "\u{1F310} " : "",
        r.label,
        " \xB7 ",
        r.pc,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
          " ",
          r.path
        ] })
      ] }, r.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy, onClick: () => {
          setDraft(set);
          setMessage("");
        }, children: "\u69CB\u6210\u3092\u7DE8\u96C6" }),
        onPicked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { onClick: () => onPicked(set.cwd), children: "\u3053\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u958B\u304F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy, onClick: () => void remove(set), children: "\u69CB\u6210\u306E\u767B\u9332\u3092\u524A\u9664" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceSetBrowser, { set })
    ] }, set.id)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u307E\u3068\u3081\u308B\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u540D" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { disabled: busy, value: draft.name, onChange: (e) => setDraft((s) => ({ ...s, name: e.target.value })), placeholder: "\u30A2\u30D7\u30EA\u3068\u8CC7\u6599" })
      ] }),
      draft.roots.map((r, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-set-root", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            "\u30D5\u30A9\u30EB\u30C0\u30FC ",
            index + 1,
            " \u306E PC"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: r.node, disabled: busy, onChange: (e) => update(index, { node: e.target.value, path: "" }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "local", children: data?.host?.name ?? "\u3053\u306E PC" }),
            data?.nodes?.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: n.id, children: n.name }, n.id))
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u7D76\u5BFE\u30D1\u30B9" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { disabled: busy, value: r.path, onChange: (e) => update(index, { path: e.target.value }), placeholder: "D:\\\\Projects \u307E\u305F\u306F /Users/\u540D\u524D/Projects" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u8868\u793A\u540D\uFF08\u4EFB\u610F\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { disabled: busy, value: r.label, onChange: (e) => update(index, { label: e.target.value }), placeholder: "\u30BD\u30FC\u30B9\u30FB\u8CC7\u6599\u306A\u3069" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy || draft.roots.length <= 2, onClick: () => setDraft((s) => ({ ...s, roots: s.roots.filter((_, i) => i !== index) })), children: "\u3053\u306E\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u5916\u3059" })
      ] }, index)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy || draft.roots.length >= 16, onClick: () => setDraft((s) => ({ ...s, roots: [...s.roots, { node: "local", path: "", label: "" }] })), children: "\uFF0B \u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u8FFD\u52A0" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", disabled: busy || !draft.name.trim() || draft.roots.some((r) => !r.path.trim()), onClick: () => void save(), children: busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u69CB\u6210\u3092\u4FDD\u5B58" }),
        draft.revision > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy, onClick: () => setDraft(blank()), children: "\u65B0\u898F\u4F5C\u6210\u306B\u623B\u308B" })
      ] })
    ] }),
    message2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "darask-login", role: "status", children: message2 }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "darask-error", children: error })
  ] });
}
function SessionFolderControls({ set, pcs, busy, onChange }) {
  const [node, setNode] = (0, import_react.useState)("local"), [absolutePath, setPath] = (0, import_react.useState)(""), [label2, setLabel] = (0, import_react.useState)("");
  async function add() {
    if (await onChange({ action: "add_root", node, absolutePath, label: label2 })) {
      setPath("");
      setLabel("");
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u3053\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u4F5C\u696D\u30D5\u30A9\u30EB\u30C0\u30FC" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "darask-muted", children: "\u8FFD\u52A0\u5148\u306F\u3053\u306E\u4F1A\u8A71\u306B\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u300C\u5916\u3059\u300D\u306F\u767B\u9332\u3060\u3051\u3092\u5916\u3057\u3001\u5B9F\u30D5\u30A1\u30A4\u30EB\u306F\u524A\u9664\u3057\u307E\u305B\u3093\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: set.roots.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
      r.node === "local" ? "" : "\u{1F310} ",
      r.label,
      " \xB7 ",
      r.pc,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "darask-meta", children: r.path }),
      r.removable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy, onClick: () => void onChange({ action: "remove_root", root: r.id }), children: "\u3053\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u304B\u3089\u5916\u3059" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306E\u5143\u306E\u4F5C\u696D\u5148" })
    ] }, r.id)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u8FFD\u52A0\u5148\u306E PC" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: node, disabled: busy, onChange: (e) => {
        setNode(e.target.value);
        setPath("");
      }, children: pcs.map((pc) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: pc.node, children: [
        pc.node === "local" ? "" : "\u{1F310} ",
        pc.name,
        pc.status === "offline" ? "\uFF08\u30AA\u30D5\u30E9\u30A4\u30F3\uFF09" : ""
      ] }, pc.node)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u30D5\u30A9\u30EB\u30C0\u30FC\u306E\u7D76\u5BFE\u30D1\u30B9" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { disabled: busy, value: absolutePath, onChange: (e) => setPath(e.target.value), placeholder: "D:\\\\Projects \u307E\u305F\u306F /Users/\u540D\u524D/Projects" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "darask-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u8868\u793A\u540D\uFF08\u4EFB\u610F\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { disabled: busy, value: label2, onChange: (e) => setLabel(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { disabled: busy || !absolutePath.trim() || set.roots.length >= 16, onClick: () => void add(), children: "\uFF0B \u4F5C\u696D\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u8FFD\u52A0" })
  ] });
}
function WorkspaceSetTab({ sessionId }) {
  const [set, setSet] = (0, import_react.useState)(null), [pcs, setPcs] = (0, import_react.useState)([{ node: "local", name: "\u3053\u306E PC" }]), [error, setError] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false);
  const active = (0, import_react.useRef)(null), mutating = (0, import_react.useRef)(false), generation = (0, import_react.useRef)(0);
  (0, import_react.useEffect)(() => {
    const c = new AbortController();
    active.current = c;
    setSet(null);
    setError("");
    setBusy(false);
    mutating.current = false;
    generation.current++;
    let timer;
    async function refresh(initial = false) {
      const n = generation.current;
      try {
        if (!mutating.current && sessionId) {
          const v = await request({ action: "list", sessionId, includePcs: initial }, "/session", c.signal);
          if (!c.signal.aborted && n === generation.current) {
            setSet(v.set);
            if (v.pcs) setPcs(v.pcs);
            setError("");
          }
        }
      } catch (e) {
        if (!c.signal.aborted && n === generation.current) setError(e.message);
      } finally {
        if (!c.signal.aborted) timer = setTimeout(() => void refresh(), 5e3);
      }
    }
    void refresh(true);
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [sessionId]);
  async function change(input) {
    if (mutating.current) return false;
    const c = active.current, n = ++generation.current;
    mutating.current = true;
    setBusy(true);
    setError("");
    try {
      const v = await request({ ...input, sessionId }, "/session", c.signal);
      if (c.signal.aborted || n !== generation.current) return false;
      setSet(v.set);
      window.dispatchEvent(new Event("darask-workspaces-changed"));
      return true;
    } catch (e) {
      if (!c.signal.aborted && n === generation.current) setError(e.message);
      return false;
    } finally {
      if (!c.signal.aborted && n === generation.current) {
        mutating.current = false;
        setBusy(false);
      }
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "darask darask-set-tab", children: [
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "darask-error", children: error }),
    set ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionFolderControls, { set, pcs, busy, onChange: change }, sessionId),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceSetBrowser, { set })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: sessionId ? "\u4F5C\u696D\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026" : "\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })
  ] });
}
function registerWorkspaceSetUi(ctx) {
  const scope = ctx;
  {
    const id = "darask-harness/workspace-folders";
    scope.effect(() => scope.sidebarRightTabs.register({ id, kind: "darask-folders", priority: "builtin", title: () => "\u30D5\u30A9\u30EB\u30C0\u30FC\u7FA4", guide: [{ order: 11, title: () => "\u30D5\u30A9\u30EB\u30C0\u30FC\u7FA4", description: () => "\u30ED\u30FC\u30AB\u30EB\u30FB\u30EA\u30E2\u30FC\u30C8\u306E\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u307E\u3068\u3081\u3066\u53C2\u7167", icon: () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "\u{1F4C2}" }) }] }));
    scope.slots.inject("sidebar.right.pane.tab", () => scope.slots.register({ name: "sidebar.right.pane.tab", key: id }, WorkspaceSetTab));
    scope.slots.inject("sidebar.right.pane.tab.title", () => scope.slots.register({ name: "sidebar.right.pane.tab.title", key: id }, () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u30D5\u30A9\u30EB\u30C0\u30FC\u7FA4" })));
  }
}

// src/connection-qr-client.jsx
var import_react2 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/connection-link.mjs
function parseConnectionLink(value) {
  const invalid2 = () => new Error("Tailscale \u7528\u306E DSH \u63A5\u7D9A QR \u307E\u305F\u306F\u8A8D\u8A3C\u30EA\u30F3\u30AF\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  if (typeof value !== "string" || value.length > 2048) throw invalid2();
  let link;
  try {
    link = new URL(value.trim());
  } catch {
    throw invalid2();
  }
  if (link.protocol !== "https:" || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z0-9-]+\.ts\.net$/i.test(link.hostname) || link.pathname !== "/" || link.username || link.password || link.hash || [...link.searchParams.keys()].length !== 1 || link.searchParams.getAll("token").length !== 1) throw invalid2();
  const token = link.searchParams.get("token");
  if (!/^[A-Za-z0-9_-]{20,512}$/.test(token)) throw invalid2();
  return { name: link.hostname.split(".")[0], url: link.origin, token };
}

// src/qr-reader.mjs
var import_jsqr = __toESM(require_jsQR(), 1);
function decodeQrPixels(image) {
  return (0, import_jsqr.default)(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}
function pixels(source, width, height) {
  const scale = Math.min(1, 1800 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
async function readQrImage(file) {
  if (!file || file.size > 20 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("20 MB \u4EE5\u4E0B\u306E PNG\u30FBJPEG\u30FBWebP \u753B\u50CF\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");
  const bitmap = await createImageBitmap(file);
  try {
    const value = decodeQrPixels(pixels(bitmap, bitmap.width, bitmap.height));
    if (!value) throw new Error("QR \u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002QR \u5168\u4F53\u304C\u306F\u3063\u304D\u308A\u5199\u3063\u305F\u753B\u50CF\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");
    return value;
  } finally {
    bitmap.close();
  }
}
async function startQrCamera(video, { signal, onScan, onError, mediaDevices = navigator.mediaDevices, readFrame = (video2) => decodeQrPixels(pixels(video2, video2.videoWidth, video2.videoHeight)) }) {
  let stream, timer, stopped = false;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
    signal?.removeEventListener("abort", stop);
  };
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) {
    stop();
    return stop;
  }
  try {
    if (!mediaDevices?.getUserMedia) throw new Error("\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u3067\u306F\u30AB\u30E1\u30E9\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002QR \u753B\u50CF\u304B\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002");
    stream = await mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    if (stopped || signal?.aborted) {
      stop();
      return stop;
    }
    video.srcObject = stream;
    await video.play();
    if (stopped || signal?.aborted) {
      stop();
      return stop;
    }
    const tick = () => {
      if (stopped) return;
      try {
        const value = video.videoWidth && video.videoHeight ? readFrame(video) : null;
        if (value) {
          stop();
          onScan(value);
          return;
        }
        timer = setTimeout(tick, 300);
      } catch {
        stop();
        onError(new Error("\u30AB\u30E1\u30E9\u304B\u3089\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002QR \u753B\u50CF\u304B\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002"));
      }
    };
    tick();
    return stop;
  } catch (error) {
    stop();
    if (signal?.aborted) return stop;
    throw new Error(error.name === "NotAllowedError" ? "\u30AB\u30E1\u30E9\u304C\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u30D6\u30E9\u30A6\u30B6\u30FC\u3067\u8A31\u53EF\u3059\u308B\u304B\u3001QR \u753B\u50CF\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002" : "\u30AB\u30E1\u30E9\u3092\u958B\u3051\u307E\u305B\u3093\u3002QR \u753B\u50CF\u304B\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002");
  }
}

// src/connection-qr-client.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function CameraReader({ onRead, onError }) {
  const video = (0, import_react2.useRef)(null);
  const callbacks = (0, import_react2.useRef)({ onRead, onError });
  callbacks.current = { onRead, onError };
  (0, import_react2.useEffect)(() => {
    const controller = new AbortController();
    void startQrCamera(video.current, { signal: controller.signal, onScan: (value) => callbacks.current.onRead(value), onError: (error) => callbacks.current.onError(error.message) }).catch((error) => {
      if (!controller.signal.aborted) callbacks.current.onError(error.message);
    });
    return () => controller.abort();
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("video", { ref: video, className: "darask-qr-camera", muted: true, playsInline: true, "aria-label": "\u63A5\u7D9A QR \u3092\u8AAD\u307F\u53D6\u308B\u30AB\u30E1\u30E9" });
}
function ConnectionQrTools({ call: call3, disabled, onImport }) {
  const [qr, setQr] = (0, import_react2.useState)(null), [mode, setMode] = (0, import_react2.useState)(null), [camera, setCamera] = (0, import_react2.useState)(false);
  const [busy, setBusy] = (0, import_react2.useState)(false), [error, setError] = (0, import_react2.useState)(""), [link, setLink] = (0, import_react2.useState)(""), [copied, setCopied] = (0, import_react2.useState)(false);
  const fileInput = (0, import_react2.useRef)(null);
  const generation = (0, import_react2.useRef)(0);
  const close = () => {
    generation.current++;
    setMode(null);
    setCamera(false);
    setQr(null);
    setLink("");
    setCopied(false);
    setError("");
    setBusy(false);
  };
  (0, import_react2.useEffect)(() => () => {
    generation.current++;
  }, []);
  async function showQr() {
    const own = ++generation.current;
    setBusy(true);
    setQr(null);
    setError("");
    setMode("share");
    try {
      const value = await call3({ action: "connectionQr" });
      if (own === generation.current) setQr(value);
    } catch (e) {
      if (own === generation.current) setError(e.message);
    } finally {
      if (own === generation.current) setBusy(false);
    }
  }
  function importLink(value) {
    setCamera(false);
    try {
      const parsed = parseConnectionLink(value);
      onImport(parsed);
      close();
    } catch (e) {
      setError(e.message);
    }
  }
  async function imageFile(file) {
    if (!file) return;
    const own = ++generation.current;
    setBusy(true);
    setCamera(false);
    setError("");
    try {
      const value = await readQrImage(file);
      if (own === generation.current) importLink(value);
    } catch (e) {
      if (own === generation.current) setError(e.message?.startsWith("QR") || e.message?.startsWith("20 MB") ? e.message : "\u753B\u50CF\u3092\u958B\u3051\u307E\u305B\u3093\u3067\u3057\u305F\u3002PNG\u30FBJPEG\u30FBWebP \u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");
    } finally {
      if (own === generation.current) setBusy(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qr.url);
      setCopied(true);
    } catch {
      setError("\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u4E0B\u306E\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u9078\u629E\u3057\u3066\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "darask-qr-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "QR \u3067\u304B\u3093\u305F\u3093\u63A5\u7D9A" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "darask-muted", children: "\u540C\u3058 Tailscale \u306B\u63A5\u7D9A\u3057\u305F PC \u540C\u58EB\u3092\u767B\u9332\u3057\u307E\u3059\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { variant: "primary", disabled: disabled || busy, onClick: () => {
          setError("");
          setMode("import");
        }, children: "QR \u3067 PC \u3092\u8FFD\u52A0" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { variant: "outline", disabled: disabled || busy, onClick: () => {
          void showQr();
        }, children: "\u3053\u306E PC \u306E QR \u3092\u8868\u793A" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Modal, { open: mode !== null, onClose: close, title: mode === "share" ? "\u3053\u306E PC \u306B\u63A5\u7D9A" : "QR \u3067 PC \u3092\u8FFD\u52A0", closeLabel: "\u9589\u3058\u308B", className: "darask-usage-modal", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "darask darask-qr-panel", children: [
      mode === "share" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        busy && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "status", children: "\u63A5\u7D9A QR \u3092\u4F5C\u6210\u4E2D\u2026" }),
        qr && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "darask-qr-heading", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: qr.host.name }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Tag, { children: "Tailscale \u5185\u3067\u63A5\u7D9A" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "darask-muted", children: "\u76F8\u624B\u306E DSH \u306E\u300CPC \u306E\u63A5\u7D9A\u300D\u3067\u8AAD\u307F\u53D6\u308B\u3068\u3001\u3053\u306E PC \u3092\u767B\u9332\u3067\u304D\u307E\u3059\u3002\u30B9\u30DE\u30DB\u306E\u30AB\u30E1\u30E9\u3067\u8AAD\u307F\u53D6\u308B\u3068 DSH \u304C\u958B\u304D\u307E\u3059\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("figure", { className: "darask-qr-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("img", { src: qr.image, alt: `${qr.host.name} \u306B\u63A5\u7D9A\u3059\u308B QR \u30B3\u30FC\u30C9`, width: "360", height: "360" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("figcaption", { children: qr.origin.replace("https://", "") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { onClick: () => {
              void copyLink();
            }, children: copied ? "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F" : "\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { className: "darask-qr-download", href: qr.image, download: `DSH-${qr.host.name.replace(/[^A-Za-z0-9_-]/g, "_")}-QR.png`, children: "QR \u753B\u50CF\u3092\u4FDD\u5B58" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("summary", { children: "\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u8868\u793A" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Input, { readOnly: true, value: qr.url, onFocus: (event) => event.target.select(), autoComplete: "off", "aria-label": "\u3053\u306E PC \u306E\u8A8D\u8A3C\u30EA\u30F3\u30AF" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "darask-muted", children: "\u8A8D\u8A3C\u60C5\u5831\u3092\u542B\u3080\u672C\u4EBA\u7528\u306E QR \u3067\u3059\u3002DSH \u3092\u518D\u8D77\u52D5\u3057\u305F\u3089\u65B0\u3057\u3044 QR \u3092\u8868\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })
        ] })
      ] }),
      mode === "import" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u63A5\u7D9A\u5148\u306E PC \u3067\u300C\u3053\u306E PC \u306E QR \u3092\u8868\u793A\u300D\u3092\u958B\u304D\u3001\u8AAD\u307F\u53D6\u3063\u3066\u304F\u3060\u3055\u3044\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "darask-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { disabled: busy, variant: "outline", onClick: () => {
            setError("");
            setCamera((value) => !value);
          }, children: camera ? "\u30AB\u30E1\u30E9\u3092\u9589\u3058\u308B" : "\u30AB\u30E1\u30E9\u3067\u8AAD\u307F\u53D6\u308B" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { disabled: busy, onClick: () => fileInput.current?.click(), children: busy ? "\u753B\u50CF\u3092\u8AAD\u307F\u53D6\u308A\u4E2D\u2026" : "QR \u753B\u50CF\u3092\u9078\u3076" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { ref: fileInput, type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true, onChange: (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void imageFile(file);
        } }),
        camera && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CameraReader, { onRead: importLink, onError: (message2) => {
          setCamera(false);
          setError(message2);
        } }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u63A5\u7D9A\u30EA\u30F3\u30AF\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u3082\u767B\u9332\u3067\u304D\u307E\u3059" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Input, { value: link, type: "password", autoComplete: "off", disabled: busy, onChange: (event) => setLink(event.target.value), placeholder: "https://win.\u2026.ts.net:8443/?token=\u2026" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { variant: "primary", disabled: busy || !link.trim(), onClick: () => importLink(link), children: "\u63A5\u7D9A\u60C5\u5831\u3092\u8AAD\u307F\u53D6\u308B" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "darask-muted", children: "QR \u306E\u89E3\u6790\u306F\u3053\u306E\u7AEF\u672B\u5185\u3067\u884C\u3044\u307E\u3059\u3002\u8AAD\u307F\u53D6\u308A\u5F8C\u306B PC \u540D\u3092\u78BA\u8A8D\u3057\u3066\u4FDD\u5B58\u3067\u304D\u307E\u3059\u3002" })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "alert", className: "darask-error", children: error })
    ] }) })
  ] });
}

// src/workspace-navigation.mjs
var REMOTE_PANEL = "darask-workspace";
var keyOf = (node, workspace) => `${node}:${workspace}`;
function createWorkspaceNavigation({ getLayout, getWindow, request: request2 }) {
  let selectedKey = null, snapshot = null, openedSnapshot = [], disposed = false;
  const opened = /* @__PURE__ */ new Map(), requests = /* @__PURE__ */ new Map(), frames = /* @__PURE__ */ new Map(), queued = /* @__PURE__ */ new Map(), listeners = /* @__PURE__ */ new Set();
  const sessionActions = /* @__PURE__ */ new Map();
  const cancelActions = (key) => {
    for (const [id, pending] of sessionActions) if (!key || pending.key === key) {
      clearTimeout(pending.timer);
      pending.reject(new Error("\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306E\u63A5\u7D9A\u304C\u9589\u3058\u3089\u308C\u307E\u3057\u305F\u3002"));
      sessionActions.delete(id);
    }
  };
  const publish = () => {
    snapshot = opened.get(selectedKey) ?? null;
    openedSnapshot = [...opened.values()];
    for (const listener of listeners) listener();
  };
  const update = (key, value) => {
    opened.set(key, value);
    publish();
  };
  const writeUrl = (node, workspace, replace = false) => {
    const browser = getWindow(), url = new URL(browser.location.href);
    if (node) {
      url.searchParams.set("pc", node);
      url.searchParams.set("workspace", workspace);
    } else {
      url.searchParams.delete("pc");
      url.searchParams.delete("workspace");
    }
    url.searchParams.delete("token");
    if (url.href !== browser.location.href) browser.history[replace ? "replaceState" : "pushState"](null, "", url.pathname + url.search + url.hash);
  };
  const activate = (node, workspace, replace) => {
    const layout = getLayout();
    layout.selectPanel(REMOTE_PANEL);
    layout.closeRightbar();
    layout.beginNavigation();
    selectedKey = keyOf(node, workspace);
    writeUrl(node, workspace, replace);
    publish();
  };
  const navigation = {
    getSnapshot: () => snapshot,
    getOpenedSnapshot: () => openedSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attachFrame(node, workspace, send) {
      const key = keyOf(node, workspace);
      frames.set(key, send);
      return () => {
        if (frames.get(key) === send) {
          frames.delete(key);
          cancelActions(key);
        }
      };
    },
    receiveSessions(data) {
      const key = keyOf(data.node, data.workspace), entry = opened.get(key);
      if (!entry || !Array.isArray(data.sessions)) return;
      const previous = new Map((entry.sessions ?? []).map((session) => [session.id, session]));
      const sessions = data.sessions.map(sanitizeRemoteSession).filter(Boolean).map((session) => {
        const last = previous.get(session.id);
        return { ...session, completed: retainCompleted(last, session), error: retainError(last, session) };
      });
      const current = typeof data.current === "string" ? data.current : null;
      const waiting = queued.get(key);
      if (waiting && frames.has(key)) {
        queued.delete(key);
        frames.get(key)(waiting);
      }
      if (!sessions.length && entry.sessions?.length) return;
      if (entry.current === current && JSON.stringify(entry.sessions) === JSON.stringify(sessions)) return;
      update(key, { ...entry, sessions, current });
    },
    openSession(id, node = snapshot?.node, workspace = snapshot?.workspace) {
      const entry = opened.get(keyOf(node, workspace));
      if (!entry?.sessions?.some((item) => item.id === id)) return;
      activate(node, workspace, false);
      frames.get(keyOf(node, workspace))?.({ type: "darask-open-session", node, workspace, session: id });
    },
    startSession(node, workspace) {
      return navigation.open(node, workspace, { newSession: true });
    },
    manageSession(node, workspace, session, action, title) {
      const key = keyOf(node, workspace), entry = opened.get(key), send = frames.get(key);
      if (!entry?.sessions?.some((item) => item.id === session) || !send || !["rename", "archive", "fork"].includes(action)) return Promise.reject(new Error("\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"));
      const requestId = globalThis.crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          sessionActions.delete(requestId);
          reject(new Error("\u64CD\u4F5C\u7D50\u679C\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"));
        }, 3e4);
        sessionActions.set(requestId, { key, node, workspace, session, action, title, resolve, reject, timer });
        send({ type: "darask-manage-session", node, workspace, session, action, title, requestId });
      });
    },
    receiveSessionResult(data) {
      const pending = sessionActions.get(data.requestId);
      if (!pending || data.node !== pending.node || data.workspace !== pending.workspace) return;
      sessionActions.delete(data.requestId);
      clearTimeout(pending.timer);
      if (!data.ok) {
        pending.reject(new Error("\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u63A5\u7D9A\u5148\u306E\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"));
        return;
      }
      const entry = opened.get(pending.key);
      if (entry && pending.action !== "fork") update(pending.key, {
        ...entry,
        sessions: pending.action === "archive" ? entry.sessions.filter((s) => s.id !== pending.session) : entry.sessions.map((s) => s.id === pending.session ? { ...s, title: pending.title } : s),
        current: pending.action === "archive" && entry.current === pending.session ? null : entry.current
      });
      pending.resolve();
    },
    workspaceChanged(node, workspace, { deleted, title }) {
      const key = keyOf(node, workspace), entry = opened.get(key);
      if (!entry) return;
      if (!deleted) {
        update(key, { ...entry, title });
        return;
      }
      cancelActions(key);
      requests.get(key)?.controller.abort();
      clearTimeout(requests.get(key)?.timer);
      requests.delete(key);
      frames.delete(key);
      queued.delete(key);
      opened.delete(key);
      if (selectedKey === key) {
        selectedKey = null;
        getLayout().selectPanel(null);
        writeUrl(null, null, true);
      }
      publish();
    },
    async open(node, workspace, { replace = false, newSession = false, force = false } = {}) {
      if (disposed) return;
      const key = keyOf(node, workspace), cached = opened.get(key);
      activate(node, workspace, replace);
      if (!force && cached?.src && !cached.error) {
        if (newSession) {
          const command = { type: "darask-new-session", node, workspace };
          if (cached.sessions && frames.has(key)) frames.get(key)(command);
          else queued.set(key, command);
        }
        return;
      }
      if (!force && requests.has(key)) {
        requests.get(key).newSession ||= newSession;
        return requests.get(key).promise;
      }
      requests.get(key)?.controller.abort();
      clearTimeout(requests.get(key)?.timer);
      const controller = new AbortController(), signal = controller.signal;
      const timer = setTimeout(() => controller.abort(Object.assign(new Error("Connection timed out"), { name: "TimeoutError" })), 45e3);
      const pending = { controller, timer, newSession };
      requests.set(key, pending);
      queued.delete(key);
      update(key, { node, workspace, loading: true, error: "", src: null });
      pending.promise = (async () => {
        try {
          const value = await request2({ action: "open", node, workspaceId: workspace }, signal);
          if (signal.aborted) throw signal.reason;
          if (requests.get(key) !== pending || disposed) return;
          const target = new URL(value.url, getWindow().location.href);
          if (target.origin !== getWindow().location.origin || target.pathname !== "/api/darask/remote" || target.searchParams.get("node") !== node || target.searchParams.get("workspace") !== workspace) throw new Error("\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u958B\u3051\u307E\u305B\u3093\u3002");
          const selected = value.host?.workspaces?.find((item) => item.id === workspace);
          if (!selected) throw new Error("\u767B\u9332\u3057\u305F\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
          target.searchParams.set("resource", "/");
          target.searchParams.set("embedded", "1");
          if (pending.newSession) target.searchParams.set("newSession", "1");
          update(key, { node, workspace, title: selected.title, loading: false, error: "", src: target.pathname + target.search });
        } catch (error) {
          if (requests.get(key) !== pending || signal.aborted && signal.reason?.name !== "TimeoutError" || disposed) return;
          update(key, { node, workspace, loading: false, error: error.name === "TimeoutError" || signal.reason?.name === "TimeoutError" ? "\u63A5\u7D9A\u306B\u6642\u9593\u304C\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002" : error.message, src: null });
        } finally {
          clearTimeout(timer);
          if (requests.get(key) === pending) requests.delete(key);
        }
      })();
      return pending.promise;
    },
    observePanel(panel) {
      if (panel === REMOTE_PANEL || !selectedKey) return;
      selectedKey = null;
      publish();
      writeUrl(null, null, true);
    },
    restore() {
      const query = new URL(getWindow().location.href).searchParams;
      const node = query.get("pc"), workspace = query.get("workspace");
      if (node && workspace) return navigation.open(node, workspace, { replace: true });
      if (selectedKey) {
        getLayout().selectPanel(null);
        navigation.observePanel(null);
      }
    },
    dispose() {
      disposed = true;
      cancelActions();
      for (const pending of requests.values()) {
        pending.controller.abort();
        clearTimeout(pending.timer);
      }
      requests.clear();
      frames.clear();
      queued.clear();
      opened.clear();
      listeners.clear();
      snapshot = null;
      openedSnapshot = [];
    }
  };
  return navigation;
}

// src/key-sharing-client.jsx
var import_react3 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime3 = require("react/jsx-runtime");
async function get(url) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(45e3) });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || "\u72B6\u614B\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002");
  return value;
}
async function post(body) {
  const response = await fetch("/api/darask/workspaces", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6e4)
  });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || "\u51E6\u7406\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3002");
  return value;
}
var groups = ["\u30E2\u30C7\u30EB", "\u305D\u306E\u4ED6"];
function ShareRow({ node, secrets, status, onStatus, onDone }) {
  const [selected, setSelected] = (0, import_react3.useState)(null);
  const [pending, setPending] = (0, import_react3.useState)(false), [error, setError] = (0, import_react3.useState)(""), [message2, setMessage] = (0, import_react3.useState)("");
  const available = (secrets ?? []).filter((row) => row.available);
  const chosen = selected ?? available.map((row) => row.ref);
  const remoteOf = (ref) => (status?.credentials ?? []).find((row) => row.ref === ref);
  const conflicts = chosen.filter((ref) => remoteOf(ref)?.source === "env");
  async function share(revoke) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await post({ action: "shareCredentials", node: node.id, refs: revoke ? available.map((row2) => row2.ref) : chosen, ...revoke ? { revoke: true } : {} });
      const row = (result.results ?? []).find((item) => item.node === node.id);
      if (row?.error) throw new Error(row.error);
      const detail = revoke ? `\u53D6\u308A\u6D88\u3057\uFF1A${(row?.removed ?? []).join(", ") || "\u5909\u66F4\u306A\u3057"}` : `\u5171\u6709\uFF1A${(row?.saved ?? []).join(", ") || "\u5909\u66F4\u306A\u3057"}${(result.missing ?? []).length ? `\uFF0F\u3053\u306E PC \u306B\u672A\u767B\u9332\uFF1A${result.missing.join(", ")}` : ""}`;
      setMessage(detail);
      await onStatus();
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "darask-details", onToggle: (event) => {
    if (event.currentTarget.open && !status) void onStatus();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
      node.name,
      " \u306B\u30AD\u30FC\u3092\u5171\u6709"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "darask-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "darask-muted", children: [
        "\u3053\u306E PC \u306B\u767B\u9332\u3057\u305F\u30AD\u30FC\u3092 ",
        node.name,
        " \u306E DSH \u306B\u4FDD\u5B58\u3057\u307E\u3059\u3002\u5024\u306F\u753B\u9762\u306B\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002\u5171\u6709\u5148\u3067\u9078\u3079\u308B\u30E2\u30C7\u30EB \u304C\u4F7F\u3048\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002"
      ] }),
      !status && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "darask-muted", children: "\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026" }),
      status && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        available.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "darask-muted", children: "\u3053\u306E PC \u3067\u767B\u9332\u6E08\u307F\u306E\u30AD\u30FC\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u300CAI \u30A2\u30AB\u30A6\u30F3\u30C8\u300D\u3067\u767B\u9332\u3057\u3066\u304B\u3089\u5171\u6709\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }),
        groups.map((group) => {
          const rows = available.filter((row) => row.group === group);
          if (!rows.length) return null;
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: group }),
            rows.map((row) => {
              const remote = remoteOf(row.ref);
              const checked = chosen.includes(row.ref);
              return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "darask-field darask-key-row", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", checked, disabled: pending, onChange: () => setSelected(checked ? chosen.filter((ref) => ref !== row.ref) : [...chosen, row.ref]) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                  row.label,
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("small", { children: [
                    row.hint,
                    "\uFF5C\u5171\u6709\u5148\uFF1A",
                    remote?.configured ? `\u4FDD\u5B58\u6E08\u307F${remote.sharedAt ? `\uFF08${new Date(remote.sharedAt).toLocaleString()}\uFF09` : ""}` : "\u672A\u8A2D\u5B9A"
                  ] })
                ] })
              ] }, row.ref);
            })
          ] }, group);
        }),
        conflicts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "darask-muted", children: [
          "\u5171\u6709\u5148\u306E\u8D77\u52D5\u74B0\u5883\u304C\u512A\u5148\u3055\u308C\u308B\u30AD\u30FC\u304C\u3042\u308A\u307E\u3059\uFF08",
          conflicts.join(", "),
          "\uFF09\u3002\u4FDD\u5B58\u3057\u3066\u3082\u4F7F\u308F\u308C\u306A\u3044\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "darask-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives3.Button, { size: "sm", variant: "primary", disabled: pending || !chosen.length, onClick: () => {
            void share(false);
          }, children: pending ? "\u5171\u6709\u4E2D\u2026" : "\u9078\u629E\u3057\u305F\u30AD\u30FC\u3092\u5171\u6709" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives3.Button, { size: "sm", disabled: pending || !available.length, onClick: () => {
            void share(true);
          }, children: "\u53D6\u308A\u6D88\u3059" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives3.Button, { size: "sm", variant: "outline", disabled: pending, onClick: () => {
            void onStatus().catch(() => {
            });
          }, children: "\u72B6\u614B\u3092\u66F4\u65B0" })
        ] }),
        (status.credentials ?? []).some((row) => row.configured) && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "darask-muted", children: [
          "\u5171\u6709\u5148\u306B\u4FDD\u5B58\u6E08\u307F\uFF1A",
          (status.credentials ?? []).filter((row) => row.configured).map((row) => row.label).join("\u3001")
        ] })
      ] }),
      message2 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { role: "status", children: message2 }),
      error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "darask-error", role: "alert", children: error })
    ] })
  ] });
}
function KeySharing({ nodes, secrets }) {
  const [statuses, setStatuses] = (0, import_react3.useState)({}), [error, setError] = (0, import_react3.useState)("");
  if (!nodes?.length) return null;
  const load = async (node) => {
    try {
      const value = await get(`/api/darask/workspaces/status?node=${encodeURIComponent(node.id)}`);
      setStatuses((current) => ({ ...current, [node.id]: value }));
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "darask-integrations", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: "\u30AD\u30FC\u306E\u5171\u6709" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "darask-muted", children: "\u30EA\u30E2\u30FC\u30C8\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306F\u3001\u305D\u306E PC \u306E DSH \u3067\u52D5\u304D\u307E\u3059\u3002\u30E2\u30C7\u30EB\u3092\u9078\u3079\u308B\u3088\u3046\u306B\u3001\u3053\u306E PC \u306B\u767B\u9332\u3057\u305F\u30AD\u30FC\u3092\u76F8\u624B\u306E PC \u306B\u307E\u3068\u3081\u3066\u4FDD\u5B58\u3067\u304D\u307E\u3059\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "darask-error", role: "alert", children: error }),
    nodes.map((node) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("article", { className: "darask-provider", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ShareRow, { node, secrets, status: statuses[node.id], onStatus: () => load(node) }) }, node.id))
  ] });
}

// src/workspaces-client.jsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var endpoint2 = "/api/darask/workspaces";
async function call(body, signal) {
  const response = await fetch(endpoint2, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    ...body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {},
    signal: signal ?? AbortSignal.timeout(45e3)
  });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || "PC \u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002");
  return value;
}
function PcConnections() {
  const [editingId, setEditingId] = (0, import_react4.useState)(null);
  const [data, setData] = (0, import_react4.useState)(null), [name2, setName] = (0, import_react4.useState)(""), [url, setUrl] = (0, import_react4.useState)(""), [token, setToken] = (0, import_react4.useState)("");
  const [pending, setPending] = (0, import_react4.useState)(false), [error, setError] = (0, import_react4.useState)(""), [saved, setSaved] = (0, import_react4.useState)(false);
  const [imported, setImported] = (0, import_react4.useState)(false);
  const [formOpen, setFormOpen] = (0, import_react4.useState)(false);
  (0, import_react4.useEffect)(() => {
    const controller = new AbortController();
    call(null, controller.signal).then(setData).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, []);
  async function save() {
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await call({ action: "saveNode", id: editingId, name: name2, url, token });
      setData(await call());
      window.dispatchEvent(new Event("darask-workspaces-changed"));
      setToken("");
      setName("");
      setUrl("");
      setEditingId(null);
      setSaved(true);
      setImported(false);
      setFormOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  async function remove(id) {
    setPending(true);
    setError("");
    try {
      await call({ action: "removeNode", id });
      setData(await call());
      window.dispatchEvent(new Event("darask-workspaces-changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-integrations", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: "PC \u306E\u63A5\u7D9A" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: "\u63A5\u7D9A\u5148\u306E PC \u306B DSH \u3068 DARASK \u3092\u5C0E\u5165\u3057\u3001QR \u3067\u767B\u9332\u3057\u307E\u3059\u3002\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306F\u305D\u306E PC \u306B\u4F5C\u6210\u3055\u308C\u307E\u3059\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ConnectionQrTools, { call, disabled: pending, onImport: (value) => {
      const existing = data?.nodes?.find((node) => node.url === value.url);
      setEditingId(existing?.id ?? null);
      setName(existing?.name ?? value.name);
      setUrl(value.url);
      setToken(value.token);
      setImported(true);
      setSaved(false);
      setError("");
      setFormOpen(true);
    } }),
    imported && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { role: "status", className: "darask-login", children: [
      name2,
      " \u306E\u63A5\u7D9A\u60C5\u5831\u3092\u8AAD\u307F\u53D6\u308A\u307E\u3057\u305F\u3002\u4E0B\u306E\u300C\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u4FDD\u5B58\u300D\u3067\u767B\u9332\u3067\u304D\u307E\u3059\u3002"
    ] }),
    data?.nodes?.map((node) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("article", { className: "darask-provider", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "darask-provider-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-provider-name", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: node.name }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "darask-meta", children: node.url })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Tag, { children: "\u767B\u9332\u6E08\u307F" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { size: "sm", disabled: pending, onClick: () => {
        setEditingId(node.id);
        setName(node.name);
        setUrl(node.url);
        setToken("");
        setSaved(false);
        setImported(false);
        setFormOpen(true);
      }, children: "\u63A5\u7D9A\u3092\u5909\u66F4" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { size: "sm", disabled: pending, onClick: () => {
        void remove(node.id);
      }, children: "\u63A5\u7D9A\u3092\u89E3\u9664" })
    ] }) }, node.id)),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "darask-provider darask-pc-manual", open: formOpen, onToggle: (event) => setFormOpen(event.currentTarget.open), children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("summary", { children: imported ? "\u8AAD\u307F\u53D6\u3063\u305F\u63A5\u7D9A\u60C5\u5831" : editingId ? "\u63A5\u7D9A\u60C5\u5831\u3092\u5909\u66F4" : "URL\u30FB\u30C8\u30FC\u30AF\u30F3\u3092\u624B\u5165\u529B\u3059\u308B" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-pc-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: editingId ? "PC \u306E\u63A5\u7D9A\u3092\u5909\u66F4" : "PC \u3092\u8FFD\u52A0" }),
        data?.peers?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "Tailscale \u306E PC" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("select", { disabled: pending, value: "", onChange: (e) => {
            const peer = data.peers.find((p) => p.dnsName === e.target.value);
            if (peer) {
              setName(peer.name);
              setUrl(`https://${peer.dnsName}:8443`);
              setToken("");
            }
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "", children: "\u4E00\u89A7\u304B\u3089\u63A5\u7D9A\u5148\u3092\u9078\u629E" }),
            data.peers.map((peer) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("option", { value: peer.dnsName, children: [
              peer.name,
              "\uFF08",
              peer.online ? "\u30AA\u30F3\u30E9\u30A4\u30F3" : "\u30AA\u30D5\u30E9\u30A4\u30F3",
              "\uFF09"
            ] }, peer.dnsName))
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "PC \u306E\u8868\u793A\u540D" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Input, { value: name2, onChange: (e) => setName(e.target.value), disabled: pending, placeholder: "win / MacBook Air" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u305D\u306E PC \u306E DSH \u306E URL" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Input, { value: url, onChange: (e) => {
            setUrl(e.target.value);
            setToken("");
          }, disabled: pending, placeholder: "https://win.\u2026.ts.net:8443", autoComplete: "off" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "DSH \u30C8\u30FC\u30AF\u30F3" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Input, { type: "password", value: token, onChange: (e) => setToken(e.target.value.trim()), disabled: pending, autoComplete: "new-password" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("small", { children: "\u8D77\u52D5 URL \u306E token= \u306E\u5F8C\u306E\u5024\u3067\u3059\u3002\u4FDD\u5B58\u6E08\u307F\u306E\u30C8\u30FC\u30AF\u30F3\u306F\u753B\u9762\u306B\u8868\u793A\u3057\u307E\u305B\u3093\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "primary", disabled: pending || !name2 || !url || !token, onClick: () => {
          void save();
        }, children: pending ? "\u63A5\u7D9A\u3092\u78BA\u8A8D\u4E2D\u2026" : "\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u4FDD\u5B58" })
      ] })
    ] }),
    saved && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { role: "status", children: "PC \u306E\u63A5\u7D9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-error", role: "alert", children: error }),
    data?.nodes?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(KeySharing, { nodes: data.nodes, secrets: data.secrets })
  ] });
}
function WorkspacePanel({ onPicked, navigation }) {
  const [data, setData] = (0, import_react4.useState)(null), [node, setNode] = (0, import_react4.useState)("local"), [inputPath, setInputPath] = (0, import_react4.useState)(""), [name2, setName] = (0, import_react4.useState)("");
  const [listing, setListing] = (0, import_react4.useState)(null), [pending, setPending] = (0, import_react4.useState)(false), [error, setError] = (0, import_react4.useState)(""), [result, setResult] = (0, import_react4.useState)(null);
  const generation = (0, import_react4.useRef)(0);
  (0, import_react4.useEffect)(() => {
    const controller = new AbortController();
    call(null, controller.signal).then(setData).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, []);
  async function browse(pc = node, value = inputPath) {
    const own = ++generation.current;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await call({ action: "browse", node: pc, path: value });
      if (own === generation.current) {
        setListing(response);
        setInputPath(response.directory.path);
      }
    } catch (e) {
      if (own === generation.current) {
        setListing(null);
        setError(e.message);
      }
    } finally {
      if (own === generation.current) setPending(false);
    }
  }
  async function create(action) {
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await call({ action, node, path: inputPath, name: name2, requestId: crypto.randomUUID() });
      setResult(response);
      setName("");
      setData((current) => mergeWorkspaceGroup(current, response.sameMachine ? "local" : node, response.host));
      setListing((current) => current ? { ...current, host: response.host } : current);
      window.dispatchEvent(new Event("darask-workspaces-changed"));
      if (onPicked && (node === "local" || response.sameMachine)) onPicked(response.workspace.path);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  async function openPc(workspaceId = result?.workspace?.id) {
    setPending(true);
    setError("");
    try {
      await navigation.open(node, workspaceId);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "darask darask-workspaces", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("header", { className: "darask-heading", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { children: "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "\u4F5C\u6210\u5148\u306E PC \u3068\u4FDD\u5B58\u5148\u3092\u9078\u3073\u307E\u3059\u3002\u305D\u306E PC \u306E\u30A2\u30AF\u30BB\u30B9\u6A29\u3067\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(WorkspaceSetsEditor, { data, onPicked }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(WorkspaceGroups, { groups: data?.groups ?? [], pending, onOpen: async (group, workspace) => {
      if (group.node === "local") {
        onPicked?.(workspace.path);
        return;
      }
      setPending(true);
      setError("");
      try {
        await navigation.open(group.node, workspace.id);
      } catch (e) {
        setError(e.message);
      } finally {
        setPending(false);
      }
    }, localCanOpen: Boolean(onPicked) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u4F5C\u6210\u5148\u306E PC" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("select", { value: node, disabled: pending, onChange: (e) => {
          const value = e.target.value;
          setNode(value);
          setInputPath("");
          setListing(null);
          setResult(null);
          void browse(value, "");
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("option", { value: "local", children: [
            data?.host?.name ?? "\u3053\u306E PC",
            "\uFF08\u3053\u306E DSH \u306E PC\uFF09"
          ] }),
          data?.nodes?.map((pc) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: pc.id, children: pc.name }, pc.id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: "\u5225\u306E PC \u306F\u300C\u8A2D\u5B9A \u2192 \u30A2\u30AB\u30A6\u30F3\u30C8 \u2192 PC\u30FBTailscale \u2192 PC \u306E\u63A5\u7D9A\u300D\u3067\u8FFD\u52A0\u3067\u304D\u307E\u3059\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u4FDD\u5B58\u5148\u306E\u30D5\u30A9\u30EB\u30C0\u30FC" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Input, { value: inputPath, onChange: (e) => setInputPath(e.target.value), disabled: pending, placeholder: node === "local" ? data?.host?.home : "C:\\Projects \u307E\u305F\u306F /Users/\u540D\u524D/Projects", autoComplete: "off" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("small", { children: "\u7D76\u5BFE\u30D1\u30B9\u3092\u76F4\u63A5\u5165\u529B\u3059\u308B\u304B\u3001\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u53C2\u7167\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "outline", disabled: pending, onClick: () => {
          void browse();
        }, children: pending ? "\u51E6\u7406\u4E2D\u2026" : "\u3053\u306E\u5834\u6240\u3092\u53C2\u7167" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => {
          void browse(node, "");
        }, children: "\u30DB\u30FC\u30E0" }),
        listing?.directory?.parent && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => {
          void browse(node, listing.directory.parent);
        }, children: "\u4E0A\u306E\u968E\u5C64" }),
        listing?.directory?.roots?.map((root) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => {
          void browse(node, root);
        }, children: root }, root))
      ] }),
      listing && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "darask-meta", children: [
          "\u63A5\u7D9A\u5148: ",
          listing.host.name,
          " \xB7 ",
          listing.directory.path
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-folder-list", children: [
          listing.directory.folders.map((folder) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", disabled: pending, onClick: () => {
            void browse(node, folder.path);
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { "aria-hidden": "true", children: "\u25B8" }),
            " ",
            folder.name
          ] }, folder.path)),
          !listing.directory.folders.length && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: "\u5B50\u30D5\u30A9\u30EB\u30C0\u30FC\u306F\u3042\u308A\u307E\u305B\u3093\u3002" })
        ] }),
        listing.directory.truncated && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: "\u5148\u982D\u306E 1,000 \u4EF6\u3092\u8868\u793A\u3057\u3066\u3044\u307E\u3059\u3002\u4FDD\u5B58\u5148\u306F\u76F4\u63A5\u5165\u529B\u3067\u304D\u307E\u3059\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u65B0\u3057\u3044\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u540D" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Input, { value: name2, onChange: (e) => setName(e.target.value), disabled: pending, placeholder: "my-project" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "primary", disabled: pending || !data || !name2 || !inputPath, onClick: () => {
          void create("create");
        }, children: "\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u4F5C\u6210\u3057\u3066\u767B\u9332" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "outline", disabled: pending || !data || !inputPath, onClick: () => {
          void create("register");
        }, children: "\u3053\u306E\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u767B\u9332" })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-error", role: "alert", children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-login", role: "status", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: result.created ? "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F\u3002" : "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u767B\u9332\u3057\u307E\u3057\u305F\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
          result.host.name,
          " \xB7 ",
          result.workspace.path
        ] }),
        node !== "local" && result.sameMachine && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "\u3053\u306E DSH \u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u4E00\u89A7\u304B\u3089\u958B\u3051\u307E\u3059\u3002\u5225\u306E DSH \u3078\u79FB\u52D5\u3057\u307E\u305B\u3093\u3002" }),
        node !== "local" && !result.sameMachine && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { children: [
            "\u30EA\u30E2\u30FC\u30C8\u74B0\u5883\u3068\u3057\u3066\u3053\u306E\u30CF\u30D6\u304B\u3089\u64CD\u4F5C\u3067\u304D\u307E\u3059\u3002\u30D5\u30A1\u30A4\u30EB\u3068\u51E6\u7406\u306F ",
            result.host.name,
            " \u4E0A\u3067\u5B9F\u884C\u3055\u308C\u307E\u3059\u3002"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "primary", disabled: pending, onClick: () => {
            void openPc();
          }, children: "\u3053\u306E\u753B\u9762\u3067\u958B\u304F" })
        ] })
      ] })
    ] })
  ] });
}
function mergeWorkspaceGroup(data, node, host) {
  if (!data) return data;
  const name2 = node === "local" ? host.name : data.nodes?.find((n) => n.id === node)?.name ?? host.name;
  const group = { node, name: name2, hostId: host.id, status: "online", workspaces: host.workspaces };
  const groups2 = data.groups ?? [];
  return { ...data, ...node === "local" ? { host } : {}, groups: groups2.some((g) => g.node === node) ? groups2.map((g) => g.node === node ? group : g) : [...groups2, group] };
}
function ActivityMark({ state }) {
  if (!state) return null;
  const label2 = sessionActivityLabel(state);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "darask-session-status", title: label2, "data-state": state, children: [
    state === "error" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "darask-session-error", "aria-hidden": "true", children: "\xD7" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.StateDot, { state }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "darask-visually-hidden", children: label2 })
  ] });
}
function WorkspaceGroups({ groups: groups2, onOpen, pending = false, localCanOpen = false, compact = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: compact ? "darask-remote-workspaces" : "darask-workspace-groups", children: groups2.map((group) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "darask-workspace-group", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("h3", { children: [
      group.name,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "darask-muted", children: [
        group.node === "local" ? "\u3053\u306E PC" : "\u30EA\u30E2\u30FC\u30C8\u74B0\u5883",
        group.status === "offline" ? " \xB7 \u30AA\u30D5\u30E9\u30A4\u30F3" : ""
      ] })
    ] }),
    group.error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: group.error }),
    group.workspaces.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "darask-workspace-entry", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", disabled: pending || group.node === "local" && !localCanOpen, onClick: () => {
      void onOpen(group, workspace);
    }, title: `${group.name} \xB7 ${workspace.path}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("strong", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ActivityMark, { state: workspaceActivity(workspace.sessions) }),
        group.node !== "local" && "\u{1F310} ",
        workspace.title
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("small", { children: workspace.path })
    ] }) }, workspace.id)),
    !group.workspaces.length && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: group.status === "offline" ? "\u4FDD\u5B58\u6E08\u307F\u306E\u4E00\u89A7\u306F\u3042\u308A\u307E\u305B\u3093\u3002" : "\u767B\u9332\u6E08\u307F\u306E\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306F\u3042\u308A\u307E\u305B\u3093\u3002" })
  ] }, group.node)) });
}
function RemoteWorkspaceRows({ groups: groups2, query = "", selected, opened = [], onOpen, onSession, onNew, onManage, onManageSession }) {
  const [details, setDetails] = (0, import_react4.useState)(null);
  const [menu, setMenu] = (0, import_react4.useState)(null), [target, setTarget] = (0, import_react4.useState)(null), [draft, setDraft] = (0, import_react4.useState)("");
  const [pending, setPending] = (0, import_react4.useState)(false), [error, setError] = (0, import_react4.useState)("");
  const normalized = query.trim().toLocaleLowerCase();
  async function save() {
    setPending(true);
    setError("");
    try {
      if (target.session) await onManageSession(target.group.node, target.workspace.id, target.session.id, target.action, draft.trim());
      else await onManage(target.group, target.workspace, target.action, draft.trim());
      setTarget(null);
    } catch (error2) {
      setError(error2.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "darask-remote-workspaces", children: groups2.filter((group) => group.node !== "local").flatMap((group) => group.workspaces.filter((workspace) => `${workspace.title} ${workspace.path} ${group.name}`.toLocaleLowerCase().includes(normalized)).map((workspace) => {
      const key = `${group.node}:${workspace.id}`, expanded = details === key;
      const active = selected?.node === group.node && selected.workspace === workspace.id;
      const retained = opened.find((entry) => entry.node === group.node && entry.workspace === workspace.id) ?? (active ? selected : null);
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-workspace-row-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-workspace-row", "data-active": active || void 0, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "darask-workspace-globe", "aria-label": `${workspace.title} \u306E\u63A5\u7D9A\u60C5\u5831`, "aria-expanded": expanded, onClick: () => setDetails(expanded ? null : key), children: "\u{1F310}" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ActivityMark, { state: workspaceActivity(retained?.sessions) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "darask-workspace-title", "aria-current": active ? "page" : void 0, onClick: () => {
            void onOpen(group, workspace);
          }, children: workspace.title }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Menu, { open: menu === key, onClose: () => setMenu(null), portal: true, items: [{ id: "rename", label: "\u540D\u524D\u3092\u5909\u66F4" }, { id: "delete", label: "\u4E00\u89A7\u304B\u3089\u524A\u9664", danger: true }], onSelect: (action) => {
            if (!["rename", "delete"].includes(action)) return;
            setMenu(null);
            setTarget({ group, workspace, action });
            setDraft(workspace.title);
            setError("");
          }, anchor: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "darask-workspace-action", "aria-label": `${workspace.title} \u306E\u64CD\u4F5C`, "aria-haspopup": "menu", "aria-expanded": menu === key, onClick: () => setMenu(menu === key ? null : key), children: "\u2026" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "darask-workspace-action", "aria-label": `${workspace.title} \u306B\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u8FFD\u52A0`, onClick: () => {
            void onNew?.(group, workspace);
          }, children: "\uFF0B" })
        ] }),
        expanded && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-workspace-info", role: "region", "aria-label": `${workspace.title} \u306E\u63A5\u7D9A\u60C5\u5831`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: group.name }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: workspace.path }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: group.status === "offline" ? "\u30AA\u30D5\u30E9\u30A4\u30F3 \xB7 \u4FDD\u5B58\u6E08\u307F\u306E\u4E00\u89A7" : "\u30AA\u30F3\u30E9\u30A4\u30F3" }),
          group.error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: group.error })
        ] }),
        retained?.sessions?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "darask-workspace-sessions", children: retained.sessions.map((session) => {
          const sessionKey = `${key}:${session.id}`;
          return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-session-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ActivityMark, { state: sessionActivity(session) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "darask-session-title", "aria-current": active && retained.current === session.id ? "page" : void 0, onClick: () => onSession?.(session.id, group.node, workspace.id), children: session.title }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Menu, { open: menu === sessionKey, onClose: () => setMenu(null), portal: true, items: [{ id: "rename", label: "\u540D\u524D\u3092\u5909\u66F4" }, { id: "fork", label: "\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u30D5\u30A9\u30FC\u30AF" }, { id: "archive", label: "\u30A2\u30FC\u30AB\u30A4\u30D6" }], onSelect: (action) => {
              if (!["rename", "fork", "archive"].includes(action)) return;
              setMenu(null);
              if (action === "fork") {
                setPending(true);
                setError("");
                Promise.resolve(onManageSession?.(group.node, workspace.id, session.id, "fork")).catch((err) => setError(err.message)).finally(() => setPending(false));
                return;
              }
              setTarget({ group, workspace, session, action });
              setDraft(session.title);
              setError("");
            }, anchor: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "darask-workspace-action", "aria-label": `${session.title} \u306E\u64CD\u4F5C`, "aria-haspopup": "menu", "aria-expanded": menu === sessionKey, onClick: () => setMenu(menu === sessionKey ? null : sessionKey), children: "\u2026" }) })
          ] }, session.id);
        }) })
      ] }, key);
    })) }),
    error && !target && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { role: "alert", className: "darask-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Modal, { open: target !== null, onClose: () => {
      if (!pending) setTarget(null);
    }, title: target?.session ? target.action === "rename" ? "\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u540D\u524D\u3092\u5909\u66F4" : "\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u30A2\u30FC\u30AB\u30A4\u30D6" : target?.action === "rename" ? "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306E\u540D\u524D\u3092\u5909\u66F4" : "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u4E00\u89A7\u304B\u3089\u524A\u9664", closeLabel: "\u9589\u3058\u308B", children: target && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask darask-workspace-dialog", children: [
      target.action === "rename" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u8868\u793A\u540D" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Input, { value: draft, maxLength: 120, autoFocus: true, disabled: pending, onChange: (event) => setDraft(event.target.value) })
      ] }) : target.session ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { children: [
        "\u300C",
        target.session.title,
        "\u300D\u3092\u30A2\u30FC\u30AB\u30A4\u30D6\u3057\u3066\u4E00\u89A7\u304B\u3089\u96A0\u3057\u307E\u3059\u3002\u4F1A\u8A71\u30C7\u30FC\u30BF\u306F\u4FDD\u6301\u3055\u308C\u307E\u3059\u3002"
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { children: [
        "\u300C",
        target.workspace.title,
        "\u300D\u3092\u4E00\u89A7\u304B\u3089\u524A\u9664\u3057\u307E\u3059\u3002\u30D5\u30A9\u30EB\u30C0\u30FC\u3068\u4F1A\u8A71\u30C7\u30FC\u30BF\u306F\u6B8B\u308A\u307E\u3059\u3002"
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { role: "alert", className: "darask-error", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => setTarget(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "primary", disabled: pending || target.action === "rename" && !draft.trim(), onClick: () => {
          void save();
        }, children: pending ? "\u4FDD\u5B58\u4E2D\u2026" : target.action === "rename" ? "\u540D\u524D\u3092\u5909\u66F4" : target.session ? "\u30A2\u30FC\u30AB\u30A4\u30D6" : "\u4E00\u89A7\u304B\u3089\u524A\u9664" })
      ] })
    ] }) })
  ] });
}
function RemoteWorkspaceSidebar({ query, navigation }) {
  const [data, setData] = (0, import_react4.useState)(null), [error, setError] = (0, import_react4.useState)("");
  const selected = (0, import_react4.useSyncExternalStore)(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
  const opened = (0, import_react4.useSyncExternalStore)(navigation.subscribe, navigation.getOpenedSnapshot, navigation.getOpenedSnapshot);
  (0, import_react4.useEffect)(() => {
    const controller = new AbortController();
    let reading = false, refreshAgain = false;
    const refresh = async () => {
      if (reading) {
        refreshAgain = true;
        return;
      }
      reading = true;
      do {
        refreshAgain = false;
        try {
          const value = await call(null, controller.signal);
          if (!controller.signal.aborted) {
            setData(value);
            setError("");
          }
        } catch (e) {
          if (!controller.signal.aborted) setError(e.message);
        }
      } while (refreshAgain && !controller.signal.aborted);
      reading = false;
    };
    void refresh();
    window.addEventListener("darask-workspaces-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 3e4);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("darask-workspaces-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const groups2 = data?.groups?.filter((g) => g.node !== "local") ?? [];
  async function manage(group, workspace, action, title) {
    const value = await call({ action, node: group.node, workspaceId: workspace.id, ...action === "rename" ? { title } : {} });
    setData((current) => mergeWorkspaceGroup(current, group.node, value.host));
    navigation.workspaceChanged(group.node, workspace.id, { deleted: action === "delete", title });
    window.dispatchEvent(new Event("darask-workspaces-changed"));
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask darask-workspaces-sidebar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(RemoteWorkspaceRows, { groups: groups2, query, selected, opened, onOpen: (group, workspace) => navigation.open(group.node, workspace.id), onSession: navigation.openSession, onNew: (group, workspace) => navigation.startSession(group.node, workspace.id), onManage: manage, onManageSession: navigation.manageSession }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-error", role: "alert", children: error })
  ] });
}
function WorkspaceDirectoryFlow({ open, onCancel, onPicked, navigation }) {
  const openNavigation = { open: (...args) => {
    onCancel();
    return navigation.open(...args);
  } };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Modal, { open, onClose: onCancel, title: "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u9078\u629E", closeLabel: "\u9589\u3058\u308B", className: "darask-usage-modal", children: open && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(WorkspacePanel, { onPicked, navigation: openNavigation }) });
}
function WorkspaceNavigationBridge({ navigation, usePanelInfo }) {
  const panel = usePanelInfo((info) => info.activePanelId);
  (0, import_react4.useEffect)(() => navigation.observePanel(panel), [navigation, panel]);
  (0, import_react4.useEffect)(() => {
    const restore = () => {
      void navigation.restore();
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [navigation]);
  return null;
}
function RemoteWorkspaceFrame({ navigation, selected, visible }) {
  const frame = (0, import_react4.useRef)(null);
  const [frameError, setFrameError] = (0, import_react4.useState)("");
  const themeObserver = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    setFrameError("");
    const receive = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.node !== selected?.node) return;
      if (event.data.type === "darask-remote-error" && typeof event.data.message === "string") setFrameError(event.data.message);
      if (event.data.type === "darask-workspace-sessions") navigation.receiveSessions(event.data);
      if (event.data.type === "darask-session-result") navigation.receiveSessionResult(event.data);
    };
    const detach = navigation.attachFrame(selected.node, selected.workspace, (message2) => frame.current?.contentWindow?.postMessage(message2, window.location.origin));
    window.addEventListener("message", receive);
    return () => {
      detach();
      themeObserver.current?.disconnect();
      window.removeEventListener("message", receive);
    };
  }, [navigation, selected?.node, selected?.workspace, selected?.src]);
  function loaded() {
    themeObserver.current?.disconnect();
    const win = frame.current?.contentWindow;
    const child = frame.current?.contentDocument;
    if (!win || win.location.href === "about:blank" || !child?.body) return;
    if (!win.__DARASK_EMBEDDED__) {
      setFrameError("\u753B\u9762\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002\u63A5\u7D9A\u5148\u306E DSH \u3092\u78BA\u8A8D\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      return;
    }
    setFrameError("");
    const sync = () => {
      const dark = document.body.hasAttribute("data-ds-dark-theme");
      if (child.body.hasAttribute("data-ds-dark-theme") !== dark) child.body.toggleAttribute("data-ds-dark-theme", dark);
    };
    const observer = new MutationObserver(sync);
    themeObserver.current = observer;
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
    observer.observe(child.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
    sync();
  }
  if (!selected) return null;
  const error = selected.error || frameError;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-workspace-main", hidden: !visible, children: [
    selected.loading && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-workspace-status", role: "status", children: "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3092\u958B\u3044\u3066\u3044\u307E\u3059\u2026" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-workspace-status", role: "alert", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { onClick: () => {
        void navigation.open(selected.node, selected.workspace, { replace: true, force: true });
      }, children: "\u518D\u8A66\u884C" })
    ] }),
    selected.src && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("iframe", { ref: frame, src: selected.src, title: selected.title || "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9", onLoad: loaded, allow: "clipboard-read; clipboard-write" }, selected.src)
  ] });
}
function RemoteWorkspacePool({ navigation, usePanelInfo }) {
  const selected = (0, import_react4.useSyncExternalStore)(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
  const opened = (0, import_react4.useSyncExternalStore)(navigation.subscribe, navigation.getOpenedSnapshot, navigation.getOpenedSnapshot);
  const active = usePanelInfo((info) => info.activePanelId) === REMOTE_PANEL;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "darask-workspace-pool", hidden: !active, children: opened.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(RemoteWorkspaceFrame, { navigation, selected: entry, visible: active && selected?.node === entry.node && selected.workspace === entry.workspace }, `${entry.node}:${entry.workspace}`)) });
}
function ArchivePanel() {
  const [data, setData] = (0, import_react4.useState)(null), [error, setError] = (0, import_react4.useState)(""), [pending, setPending] = (0, import_react4.useState)(false), [target, setTarget] = (0, import_react4.useState)(null);
  async function load(signal) {
    const response = await fetch("/api/darask/archives", { credentials: "same-origin", cache: "no-store", signal: signal ?? AbortSignal.timeout(2e4) });
    const value = await response.json();
    if (!response.ok || value.error) throw new Error(value.error || "\u30A2\u30FC\u30AB\u30A4\u30D6\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002");
    setData(value);
    setError("");
  }
  (0, import_react4.useEffect)(() => {
    const controller = new AbortController();
    load(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, []);
  async function act(action, sessionId) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/darask/archives", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, sessionId }) });
      const value = await response.json();
      if (!response.ok || value.error) throw new Error(value.error || "\u64CD\u4F5C\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
      setData(value);
      setTarget(null);
      window.dispatchEvent(new Event("darask-workspaces-changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "darask", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("header", { className: "darask-heading", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { children: "\u30A2\u30FC\u30AB\u30A4\u30D6" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "\u4E00\u89A7\u304B\u3089\u96A0\u3057\u305F\u4F1A\u8A71\u3092\u623B\u3059\u304B\u3001\u4F1A\u8A71\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3057\u307E\u3059\u3002\u5FA9\u5143\u3059\u308B\u3068\u30B5\u30A4\u30C9\u30D0\u30FC\u306B\u518D\u8868\u793A\u3055\u308C\u307E\u3059\u3002" })
    ] }) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { role: "alert", className: "darask-error", children: error }),
    !data && !error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { role: "status", children: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026" }),
    data && data.items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "darask-muted", children: "\u30A2\u30FC\u30AB\u30A4\u30D6\u3057\u305F\u4F1A\u8A71\u306F\u3042\u308A\u307E\u305B\u3093\u3002" }),
    data?.items?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "darask-archive-list", children: data.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("article", { className: "darask-provider", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "darask-provider-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-provider-name", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: item.title }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "darask-meta", children: [
          item.workspaceTitle,
          item.path ? ` \xB7 ${item.path}` : ""
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => {
          void act("restore", item.id);
        }, children: "\u4E00\u89A7\u306B\u623B\u3059" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => setTarget(item), children: "\u524A\u9664" })
      ] })
    ] }) }, item.id)) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Modal, { open: target !== null, onClose: () => {
      if (!pending) setTarget(null);
    }, title: "\u30A2\u30FC\u30AB\u30A4\u30D6\u3092\u524A\u9664", closeLabel: "\u9589\u3058\u308B", children: target && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask darask-workspace-dialog", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { children: [
        "\u300C",
        target.title,
        "\u300D\u306E\u4F1A\u8A71\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3057\u307E\u3059\u3002\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { disabled: pending, onClick: () => setTarget(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives4.Button, { variant: "primary", disabled: pending, onClick: () => {
          void act("delete", target.id);
        }, children: pending ? "\u524A\u9664\u4E2D\u2026" : "\u524A\u9664" })
      ] })
    ] }) })
  ] });
}
function RemoteWorkspacePanel() {
  return null;
}
function registerWorkspaceUi(ctx) {
  registerWorkspaceSetUi(ctx);
  const navigation = createWorkspaceNavigation({ getLayout: () => ctx.layout, getWindow: () => window, request: call });
  ctx.effect(() => () => navigation.dispose());
  const inject2 = () => ({ navigation });
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: REMOTE_PANEL, inject: inject2 }, RemoteWorkspacePanel));
  ctx.slots.inject("main.persistent", () => ctx.slots.register({ name: "main.persistent", inject: inject2 }, RemoteWorkspacePool));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "darask-workspace-navigation", inject: inject2 }, WorkspaceNavigationBridge));
  ctx.slots.inject("sidebar.workspaces.remote", () => ctx.slots.register({ name: "sidebar.workspaces.remote", inject: inject2 }, RemoteWorkspaceSidebar));
  ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "darask-workspaces", order: 12, label: () => "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9", inject: inject2 }, WorkspacePanel));
  ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "darask-archives", order: 13, label: () => "\u30A2\u30FC\u30AB\u30A4\u30D6" }, ArchivePanel));
  for (const slot of ["conversation.hero.workspace.directoryFlow", "sidebar.workspaces.directoryFlow"]) {
    ctx.slots.inject(slot, () => ctx.slots.register({ name: slot, priority: -20, inject: inject2 }, WorkspaceDirectoryFlow));
  }
}

// src/development-client.jsx
var import_react5 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives5 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime5 = require("react/jsx-runtime");
function RestartRow({ t }) {
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [status, setStatus] = (0, import_react5.useState)("");
  async function restart() {
    setBusy(true);
    setStatus(t("restarting"));
    try {
      const response = await fetch("/api/darask/restart", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(8e3) });
      const value = await response.json().catch(() => ({}));
      if (!response.ok || value.error) throw new Error(value.error || t("restartFailed"));
      setStatus(t("restartReconnect"));
      const started = Date.now();
      while (Date.now() - started < 45e3) {
        await new Promise((done) => setTimeout(done, 1500));
        try {
          const probe = await fetch("/api/darask/status", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(4e3) });
          if (probe.ok) {
            window.location.reload();
            return;
          }
        } catch {
        }
      }
      setStatus(t("restartTimeout"));
    } catch (error) {
      setStatus(error.message || t("restartFailed"));
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-restart-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: t("restartTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: status || t("restartDesc") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { disabled: busy, onClick: () => {
      void restart();
    }, children: t("restartNow") })
  ] });
}
async function call2(action, signal) {
  const response = await fetch("/api/darask/development", {
    credentials: "same-origin",
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(2e4),
    ...action ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) } : {}
  });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || "\u958B\u767A\u6A5F\u80FD\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002");
  return value;
}
function DevelopmentPanel() {
  const [data, setData] = (0, import_react5.useState)(null), [error, setError] = (0, import_react5.useState)(""), [pending, setPending] = (0, import_react5.useState)(false), [diff, setDiff] = (0, import_react5.useState)(null), [notice, setNotice] = (0, import_react5.useState)("");
  (0, import_react5.useEffect)(() => {
    const controller = new AbortController();
    let timer;
    const load = async () => {
      try {
        setData(await call2(null, controller.signal));
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("DSH \u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002\u66F4\u65B0\u30FB\u518D\u8D77\u52D5\u4E2D\u306F\u3001\u3053\u306E\u753B\u9762\u3067\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u3002");
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(load, 2e3);
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  const busy = pending || data?.job?.phase === "running" || data?.distribute?.job?.phase === "running";
  async function perform(action) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const value = await call2(action);
      if (action === "diff") setDiff(value.diff);
      else setData(await call2());
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  async function register() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/darask/workspaces", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "register", node: "local", path: data.source, requestId: crypto.randomUUID() }) });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "\u767B\u9332\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
      setNotice("\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306B\u767B\u9332\u3057\u307E\u3057\u305F\u3002\u5DE6\u5074\u306E\u4E00\u89A7\u304B\u3089 darask-harness \u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044\u3002");
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "darask", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("header", { className: "darask-heading", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { children: "\u958B\u767A\u30FB\u66F4\u65B0" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: "Git \u3067\u7BA1\u7406\u3057\u305F\u30BD\u30FC\u30B9\u3092\u7DE8\u96C6\u3057\u3001\u753B\u9762\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u53CD\u6620\u3057\u307E\u3059\u3002" })
    ] }) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "darask-error", role: "alert", children: error }),
    !data && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { role: "status", children: "Git \u306E\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026" }),
    data && !data.available && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: data.message }),
    data?.available && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("article", { className: "darask-provider", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("header", { className: "darask-provider-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: "darask-harness" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Tag, { children: data.version }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Tag, { children: data.branch || "\u30D6\u30E9\u30F3\u30C1\u672A\u9078\u629E" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Tag, { children: data.dirty ? "\u672A\u30B3\u30DF\u30C3\u30C8\u306E\u7DE8\u96C6\u3042\u308A" : "\u5909\u66F4\u306A\u3057" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-usage", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: "\u3053\u306E PC \u306E\u7DE8\u96C6\u7528\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("code", { className: "darask-source-path", children: data.source })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { disabled: busy, onClick: () => {
              void register();
            }, children: "\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306B\u767B\u9332" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { disabled: busy, onClick: () => {
              void perform("diff");
            }, children: "\u5DEE\u5206\u3092\u898B\u308B" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "darask-muted", children: "src \u306E\u7DE8\u96C6\u306F\u4FDD\u5B58\u3059\u308B\u3068\u53CD\u6620\u3055\u308C\u307E\u3059\u3002\u8868\u793A\u304C\u5909\u308F\u3089\u306A\u3044\u5834\u5408\u306F\u300C\u7DE8\u96C6\u3092\u53CD\u6620\u300D\u3092\u62BC\u3057\u3066\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30B3\u30DF\u30C3\u30C8\u30FBpush \u306F\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u3067\u884C\u3044\u307E\u3059\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { variant: "primary", disabled: busy, onClick: () => {
              void perform("build");
            }, children: "\u7DE8\u96C6\u3092\u53CD\u6620" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { disabled: busy, onClick: () => window.location.reload(), children: "\u753B\u9762\u3092\u518D\u8AAD\u307F\u8FBC\u307F" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("article", { className: "darask-provider", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("header", { className: "darask-provider-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: "GitHub \u304B\u3089\u66F4\u65B0" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Tag, { children: data.head.slice(0, 8) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-usage", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: data.behind === null ? "\u300C\u66F4\u65B0\u3092\u78BA\u8A8D\u300D\u3067 GitHub \u306E\u6700\u65B0\u7248\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : `\u53D6\u5F97\u6E08\u307F\u306E main \u3068\u6BD4\u8F03: \u672A\u9069\u7528 ${data.behind} \u4EF6 / \u30ED\u30FC\u30AB\u30EB\u306E\u307F ${data.ahead} \u4EF6` }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "darask-muted", children: [
            "\u66F4\u65B0\u6642\u306F DSH \u3092\u518D\u8D77\u52D5\u3057\u307E\u3059\u3002\u5B9F\u884C\u4E2D\u306E\u30BF\u30B9\u30AF\u3092\u7D42\u3048\u3066\u304B\u3089\u64CD\u4F5C\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u672A\u30B3\u30DF\u30C3\u30C8\u306E\u7DE8\u96C6\u3084\u5C65\u6B74\u306E\u5206\u5C90\u304C\u3042\u308B\u5834\u5408\u306F\u4E0A\u66F8\u304D\u305B\u305A\u505C\u6B62\u3057\u307E\u3059\u3002",
            data.distribute?.nodes > 0 && `\u9069\u7528\u5F8C\u3001\u767B\u9332\u6E08\u307F\u306E PC\uFF08${data.distribute.nodes} \u53F0\uFF09\u306B\u3082\u81EA\u52D5\u3067\u914D\u5E03\u3057\u307E\u3059\u3002`
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { disabled: busy || !data.remoteReady, onClick: () => {
              void perform("check");
            }, children: "\u66F4\u65B0\u3092\u78BA\u8A8D" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { variant: "primary", disabled: busy || data.dirty || !data.remoteReady || data.branch !== "main", onClick: () => {
              void perform("update");
            }, children: "\u6700\u65B0\u7248\u3092\u9069\u7528\u3057\u3066\u518D\u8D77\u52D5" })
          ] }),
          data.changes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("details", { className: "darask-details", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("summary", { children: [
              "\u5909\u66F4\u3057\u305F\u30D5\u30A1\u30A4\u30EB\uFF08",
              data.changes.length,
              "\uFF09"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "darask-git-diff", children: data.changes.join("\n") })
          ] })
        ] })
      ] }),
      data.job && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: data.job.phase === "error" ? "darask-error" : "darask-muted", role: "status", children: data.job.message })
    ] }),
    data?.distribute && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("article", { className: "darask-provider", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("header", { className: "darask-provider-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: "\u767B\u9332\u6E08\u307F\u306E PC \u306B\u914D\u5E03" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_dsh_client_ui_primitives5.Tag, { children: [
          data.distribute.nodes,
          " \u53F0"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "darask-usage", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "darask-muted", children: "\u3053\u306E PC \u306E darask-harness \u3092\u767B\u9332\u6E08\u307F\u306E PC \u306B\u914D\u5E03\u3057\u307E\u3059\u3002\u5404 PC \u306F DSH \u3092\u518D\u8D77\u52D5\u3059\u308B\u305F\u3081\u3001\u5B9F\u884C\u4E2D\u306E\u4F5C\u696D\u3092\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u958B\u767A\u30E2\u30FC\u30C9\u306E PC \u306F GitHub \u304B\u3089\u66F4\u65B0\u3057\u307E\u3059\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "darask-actions", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_dsh_client_ui_primitives5.Button, { variant: "primary", disabled: busy || !data.distribute.nodes, onClick: () => {
          void perform("distribute");
        }, children: "\u3053\u306E PC \u304B\u3089\u914D\u5E03" }) }),
        data.distribute.pending && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "darask-muted", role: "status", children: "\u518D\u8D77\u52D5\u5F8C\u306B\u914D\u5E03\u3092\u5B9F\u884C\u3059\u308B\u4E88\u5B9A\u3067\u3059\u3002" }),
        data.distribute.job && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: data.distribute.job.phase === "error" ? "darask-error" : "darask-muted", role: "status", children: data.distribute.job.message }),
        data.distribute.last?.error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "darask-error", children: data.distribute.last.error }),
        data.distribute.last?.results?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("details", { className: "darask-details", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("summary", { children: [
            "\u524D\u56DE\u306E\u7D50\u679C\uFF08",
            new Date(data.distribute.last.at).toLocaleString("ja-JP"),
            "\uFF09"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "darask-git-diff", children: data.distribute.last.results.map((row) => `${row.name}: ${row.ok ? "OK" : "NG"} \u2014 ${row.message}`).join("\n") })
        ] })
      ] })
    ] }),
    notice && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { role: "status", children: notice }),
    diff !== null && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("details", { open: true, className: "darask-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("summary", { children: "\u30BD\u30FC\u30B9\u306E\u5DEE\u5206\uFF08\u6700\u5927 10 \u4E07\u6587\u5B57\u30FB\u751F\u6210\u30D5\u30A1\u30A4\u30EB\u3068\u672A\u8FFD\u8DE1\u30D5\u30A1\u30A4\u30EB\u306E\u5185\u5BB9\u3092\u9664\u304F\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "darask-git-diff", children: diff || "\u8FFD\u8DE1\u4E2D\u306E\u30BD\u30FC\u30B9\u306B\u5DEE\u5206\u306F\u3042\u308A\u307E\u305B\u3093\u3002" })
    ] })
  ] });
}

// src/addons-client.jsx
var import_react6 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives6 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/addons/locale.mjs
var addonsDictionaries = {
  ja: {
    title: "\u30D7\u30E9\u30B0\u30A4\u30F3",
    description: "Hermes / oh-my-deepseek \u304B\u3089\u30D5\u30A9\u30FC\u30AF\u3057\u305F\u6A5F\u80FD\u3067\u3059\u3002\u521D\u671F\u72B6\u614B\u306F\u3059\u3079\u3066\u6709\u52B9\u3067\u3059\u3002\u79D8\u5BC6\u60C5\u5831\u306F\u4FDD\u5B58\u6E08\u307F\u3067\u3082\u518D\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    refresh: "\u72B6\u614B\u3092\u66F4\u65B0",
    loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
    retry: "\u518D\u8AAD\u307F\u8FBC\u307F",
    save: "\u5909\u66F4\u3092\u4FDD\u5B58",
    saved: "\u4FDD\u5B58\u3057\u307E\u3057\u305F",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    unsaved: "\u672A\u4FDD\u5B58\u306E\u5909\u66F4",
    failed: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
    loadFailed: "\u30D7\u30E9\u30B0\u30A4\u30F3\u72B6\u614B\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    enabled: "\u6709\u52B9",
    disabled: "\u7121\u52B9",
    origin: "\u7531\u6765",
    tools: "\u30C4\u30FC\u30EB",
    secrets: "\u63A5\u7D9A\u30AD\u30FC",
    configured: "\u8A2D\u5B9A\u6E08\u307F",
    missing: "\u672A\u8A2D\u5B9A",
    securityBlock: "\u5371\u967A\u30D1\u30BF\u30FC\u30F3\u306E\u66F8\u304D\u8FBC\u307F\u3092\u62D2\u5426\u3059\u308B",
    securityBlockHint: "\u30AA\u30D5\u306E\u3068\u304D\u306F\u8B66\u544A\u3060\u3051\u3092\u8FD4\u3057\u307E\u3059\u3002\u30AA\u30F3\u306E\u3068\u304D\u306F write/edit \u3092\u62D2\u5426\u3057\u307E\u3059\u3002",
    langfuseHost: "Langfuse \u306E URL",
    imageModel: "\u753B\u50CF\u30E2\u30C7\u30EB",
    telegramChatId: "Telegram \u30C1\u30E3\u30C3\u30C8 ID",
    chromeProfile: "Chrome \u30D7\u30ED\u30D5\u30A1\u30A4\u30EB",
    r2AccountId: "R2 \u30A2\u30AB\u30A6\u30F3\u30C8 ID",
    r2Bucket: "R2 \u30D0\u30B1\u30C3\u30C8",
    r2PublicBase: "\u516C\u958B\u30D9\u30FC\u30B9 URL\uFF08\u4EFB\u610F\uFF09",
    secretHint: "\u65B0\u3057\u3044\u5024\u3092\u5165\u308C\u308B\u3068\u4FDD\u5B58\u6642\u306B\u66F4\u65B0\u3057\u307E\u3059\u3002\u4FDD\u5B58\u6E08\u307F\u306E\u5024\u306F\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    discard: "\u5909\u66F4\u3092\u623B\u3059",
    kanban: "\u304B\u3093\u3070\u3093",
    achievements: "\u30D0\u30C3\u30B8",
    empty: "\u307E\u3060\u30AB\u30FC\u30C9\u304C\u3042\u308A\u307E\u305B\u3093\u3002darask_kanban \u3067\u8FFD\u52A0\u3057\u307E\u3059\u3002",
    groups: "\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u7A2E\u985E"
  },
  en: {
    title: "Plugins",
    description: "Forked Hermes / oh-my-deepseek capabilities. All start enabled. Stored secrets are never redisplayed.",
    refresh: "Refresh",
    loading: "Loading\u2026",
    retry: "Reload",
    save: "Save changes",
    saved: "Saved",
    saving: "Saving\u2026",
    unsaved: "Unsaved changes",
    failed: "Save failed.",
    loadFailed: "Unable to load plugin status.",
    enabled: "Enabled",
    disabled: "Disabled",
    origin: "Origin",
    tools: "Tools",
    secrets: "Credentials",
    configured: "Configured",
    missing: "Missing",
    securityBlock: "Block dangerous writes",
    securityBlockHint: "Off warns only. On refuses matching write/edit calls.",
    langfuseHost: "Langfuse URL",
    imageModel: "Image model",
    telegramChatId: "Telegram chat id",
    chromeProfile: "Chrome profile",
    r2AccountId: "R2 account id",
    r2Bucket: "R2 bucket",
    r2PublicBase: "Public base URL (optional)",
    secretHint: "Enter a new value to replace it on save. Stored values are never shown.",
    discard: "Discard changes",
    kanban: "Kanban",
    achievements: "Badges",
    empty: "No cards yet. Use darask_kanban to add one.",
    groups: "Plugin groups"
  }
};

// src/addons-client.jsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function createAddonsResource() {
  let snapshot = { data: null, loading: true, error: null };
  const listeners = /* @__PURE__ */ new Set();
  const publish = (patch) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };
  const request2 = async (path, options = {}) => {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options, signal: AbortSignal.timeout(3e4) });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) throw new Error(typeof body?.error === "string" ? body.error : `HTTP ${response.status}`);
    return body;
  };
  const load = async () => {
    publish({ loading: true, error: null });
    try {
      publish({ data: await request2("/api/darask/addons"), loading: false });
    } catch (error) {
      publish({ loading: false, error: error.message });
    }
  };
  const action = async (payload) => {
    const data = await request2("/api/darask/addons/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    publish({ data, error: null, loading: false });
    return data;
  };
  return {
    load,
    action,
    source: { subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, getSnapshot: () => snapshot }
  };
}
function PluginCard({ plugin, enabled, secrets, fields, pending, t, onToggle, onField, onSecret }) {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("article", { className: "darask-provider", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "darask-provider-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "darask-provider-name", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { children: plugin.titleJa }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "darask-meta", children: plugin.summaryJa })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Tag, { tone: enabled ? "success" : "neutral", children: t(enabled ? "enabled" : "disabled") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Switch, { checked: enabled, disabled: pending, label: plugin.titleJa, onChange: onToggle })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "darask-usage", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "darask-muted", children: [
        t("origin"),
        ": ",
        plugin.origin
      ] }),
      plugin.tools?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "darask-meta", children: [
        t("tools"),
        ": ",
        plugin.tools.join(", ")
      ] }),
      plugin.id === "security-guidance" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t("securityBlock") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Switch, { checked: fields.securityBlock, disabled: pending, label: t("securityBlock"), onChange: (value) => onField("securityBlock", value) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("small", { children: t("securityBlockHint") })
      ] }),
      (plugin.fields ?? []).map((field) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t(field) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Input, { value: fields[field] ?? "", disabled: pending, onChange: (event) => onField(field, event.target.value), autoComplete: "off" })
      ] }, field)),
      (plugin.secrets ?? []).map((key) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "darask-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
          key.replace("DARASK_", ""),
          " \xB7 ",
          t(secrets[key] ? "configured" : "missing")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Input, { type: "password", value: fields.secrets[key] ?? "", disabled: pending, onChange: (event) => onSecret(key, event.target.value), autoComplete: "new-password" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("small", { children: t("secretHint") })
      ] }, key))
    ] })
  ] });
}
function KanbanBoard({ board, t }) {
  if (!board) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "darask-kanban", "aria-label": t("kanban"), children: board.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "darask-kanban-column", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { children: column }),
    (board.cards ?? []).filter((card) => card.column === column).map((card) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "darask-kanban-card", children: [
      card.title,
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("small", { children: card.id })
    ] }, card.id)),
    (board.cards ?? []).every((card) => card.column !== column) && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "darask-muted", children: t("empty") })
  ] }, column)) });
}
function AddonsPanel({ resource, t }) {
  const [snap, setSnap] = (0, import_react6.useState)(resource.source.getSnapshot());
  const [group, setGroup] = (0, import_react6.useState)("deepseek");
  const [draft, setDraft] = (0, import_react6.useState)(null);
  const [secrets, setSecrets] = (0, import_react6.useState)({});
  const [saved, setSaved] = (0, import_react6.useState)(false);
  (0, import_react6.useEffect)(() => resource.source.subscribe(() => setSnap(resource.source.getSnapshot())), [resource]);
  (0, import_react6.useEffect)(() => {
    void resource.load();
  }, [resource]);
  const data = snap.data;
  const pending = snap.loading && !data;
  const enabled = draft?.enabled ?? Object.fromEntries((data?.groups ?? []).flatMap((item) => item.plugins.map((plugin) => [plugin.id, plugin.enabled])));
  const fields = {
    securityBlock: draft?.securityBlock ?? data?.securityBlock ?? false,
    langfuseHost: draft?.langfuseHost ?? data?.langfuseHost ?? "",
    imageModel: draft?.imageModel ?? data?.imageModel ?? "",
    telegramChatId: draft?.telegramChatId ?? data?.telegramChatId ?? "",
    chromeProfile: draft?.chromeProfile ?? data?.chromeProfile ?? "",
    r2AccountId: draft?.r2AccountId ?? data?.r2AccountId ?? "",
    r2Bucket: draft?.r2Bucket ?? data?.r2Bucket ?? "",
    r2PublicBase: draft?.r2PublicBase ?? data?.r2PublicBase ?? "",
    secrets
  };
  const dirty = draft !== null || Object.values(secrets).some(Boolean);
  const save = async () => {
    try {
      await resource.action({ action: "save", config: { enabled, securityBlock: fields.securityBlock, langfuseHost: fields.langfuseHost, imageModel: fields.imageModel, telegramChatId: fields.telegramChatId, chromeProfile: fields.chromeProfile, r2AccountId: fields.r2AccountId, r2Bucket: fields.r2Bucket, r2PublicBase: fields.r2PublicBase }, secrets: Object.fromEntries(Object.entries(secrets).filter(([, value]) => value)) });
      setDraft(null);
      setSecrets({});
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };
  const groups2 = data?.groups ?? [];
  const current = groups2.find((item) => item.id === group) ?? groups2[0];
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "darask", "aria-label": t("title"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "darask-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { children: t("description") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Button, { variant: "outline", disabled: snap.loading, onClick: () => {
        void resource.load();
      }, children: t("refresh") })
    ] }),
    snap.error && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "darask-error", role: "alert", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: snap.error || t("loadFailed") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Button, { size: "sm", onClick: () => {
        void resource.load();
      }, children: t("retry") })
    ] }),
    pending && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "darask-muted", children: t("loading") }),
    data && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "darask-account-tabs", role: "tablist", "aria-label": t("groups"), children: groups2.map((item) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Button, { role: "tab", "aria-selected": current?.id === item.id, variant: current?.id === item.id ? "primary" : "outline", onClick: () => setGroup(item.id), children: item.titleJa }, item.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "darask-provider-list", children: (current?.plugins ?? []).map((plugin) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        PluginCard,
        {
          plugin,
          enabled: enabled[plugin.id] === true,
          secrets: data.secrets ?? {},
          fields,
          pending: snap.loading,
          t,
          onToggle: (value) => setDraft((currentDraft) => ({ ...currentDraft ?? { enabled, securityBlock: fields.securityBlock, langfuseHost: fields.langfuseHost, imageModel: fields.imageModel, telegramChatId: fields.telegramChatId, chromeProfile: fields.chromeProfile, r2AccountId: fields.r2AccountId, r2Bucket: fields.r2Bucket, r2PublicBase: fields.r2PublicBase }, enabled: { ...enabled, [plugin.id]: value } })),
          onField: (key, value) => setDraft((currentDraft) => ({ ...currentDraft ?? { enabled, securityBlock: fields.securityBlock, langfuseHost: fields.langfuseHost, imageModel: fields.imageModel, telegramChatId: fields.telegramChatId, chromeProfile: fields.chromeProfile, r2AccountId: fields.r2AccountId, r2Bucket: fields.r2Bucket, r2PublicBase: fields.r2PublicBase }, [key]: value })),
          onSecret: (key, value) => {
            setSecrets((currentSecrets) => ({ ...currentSecrets, [key]: value }));
            setSaved(false);
          }
        },
        plugin.id
      )) }),
      current?.id === "ops" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "darask-addon-extra", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { children: t("kanban") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(KanbanBoard, { board: data.kanban, t }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { children: t("achievements") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("pre", { className: "darask-git-diff", children: data.achievements })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("footer", { className: "darask-footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { role: "status", children: dirty ? t("unsaved") : saved ? t("saved") : "" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Button, { disabled: !dirty, onClick: () => {
          setDraft(null);
          setSecrets({});
          setSaved(false);
        }, children: t("discard") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives6.Button, { variant: "primary", disabled: !dirty || snap.loading, onClick: () => {
          void save();
        }, children: snap.loading ? t("saving") : t("save") })
      ] })
    ] })
  ] });
}
function registerAddonsUi(ctx) {
  const resource = createAddonsResource();
  ctx.effect(() => ctx.locale.register("settings.darask-addons", addonsDictionaries), "darask-harness addons locale");
  const t = ctx.locale.bind("settings.darask-addons");
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "darask-addons",
    order: 12,
    locale: "settings.darask-addons",
    label: () => t("title")
  }, () => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(AddonsPanel, { resource, t })));
}

// src/session-navigation-client.jsx
var import_react7 = __toESM(require("react"), 1);
var import_jsx_runtime7 = require("react/jsx-runtime");
var USER_ROWS = '[data-chat-flow-kind="user"]:not([hidden])';
function visibleScroller(root = document) {
  const candidates = [...root.querySelectorAll("[data-conversation-scroll]")];
  return candidates.find((node) => node.getClientRects().length > 0 && node.clientHeight > 0) ?? null;
}
function sessionNavigationState(root = document) {
  const scroller = visibleScroller(root);
  if (!scroller) return { scroller: null, users: [], previous: null, next: null };
  const users = [...scroller.querySelectorAll(USER_ROWS)].filter((row) => row.getClientRects().length > 0);
  const port = scroller.getBoundingClientRect();
  const line = port.top + Math.min(48, port.height * 0.2);
  const previous = users.filter((row) => row.getBoundingClientRect().top < line - 2).at(-1) ?? null;
  const next = users.find((row) => row.getBoundingClientRect().top > line + 2) ?? null;
  return { scroller, users, previous, next };
}
function navigateSession(direction, root = document) {
  const state = sessionNavigationState(root);
  if (!state.scroller) return false;
  if (direction === "top" || direction === "bottom") {
    state.scroller.scrollTo({ top: direction === "top" ? 0 : state.scroller.scrollHeight, behavior: "smooth" });
    return true;
  }
  const target = direction === "previous-user" ? state.previous : state.next;
  if (!target) return false;
  target.scrollIntoView({ block: "start", behavior: "smooth" });
  return true;
}
function SessionNavigation() {
  const [available, setAvailable] = (0, import_react7.useState)(false);
  (0, import_react7.useEffect)(() => {
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setAvailable(Boolean(visibleScroller())));
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style"] });
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, []);
  if (!available) return null;
  const move = (direction) => {
    navigateSession(direction);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("nav", { className: "darask-session-navigation", "aria-label": "\u4F1A\u8A71\u5185\u3092\u79FB\u52D5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": "\u4F1A\u8A71\u306E\u4E00\u756A\u4E0A\u3078", title: "\u4E00\u756A\u4E0A", onClick: () => move("top"), children: "\u21C8" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": "\u524D\u306E\u30E6\u30FC\u30B6\u30FC\u767A\u8A00\u3078", title: "\u524D\u306E\u30E6\u30FC\u30B6\u30FC\u767A\u8A00", onClick: () => move("previous-user"), children: "\u2191" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": "\u6B21\u306E\u30E6\u30FC\u30B6\u30FC\u767A\u8A00\u3078", title: "\u6B21\u306E\u30E6\u30FC\u30B6\u30FC\u767A\u8A00", onClick: () => move("next-user"), children: "\u2193" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": "\u4F1A\u8A71\u306E\u4E00\u756A\u4E0B\u3078", title: "\u4E00\u756A\u4E0B", onClick: () => move("bottom"), children: "\u21CA" })
  ] });
}
function registerSessionNavigation(ctx) {
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "darask-session-navigation" }, SessionNavigation));
}

// src/locales/settings.mjs
var NS = "settings.darask";
var dictionaries = {
  ja: {
    title: "\u30A2\u30AB\u30A6\u30F3\u30C8",
    description: "\u30ED\u30B0\u30A4\u30F3\u3068\u63A5\u7D9A\u3092\u307E\u3068\u3081\u3066\u7BA1\u7406\u3057\u307E\u3059\u3002\u4F7F\u7528\u91CF\u3068\u6B8B\u91CF\u306F\u3001\u8A2D\u5B9A\u306E\u4E0A\u306B\u3042\u308B Usage \u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002",
    aiTab: "AI \u30A2\u30AB\u30A6\u30F3\u30C8",
    pcTab: "PC\u30FBTailscale",
    browserTab: "\u30D6\u30E9\u30A6\u30B6\u30FC\u30FB\u753B\u9762\u64CD\u4F5C",
    accountTabs: "\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u7A2E\u985E",
    usageTitle: "Usage",
    usageEmpty: "\u8868\u793A\u3067\u304D\u308B\u4F7F\u7528\u91CF\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u8A2D\u5B9A\u306E\u300C\u30A2\u30AB\u30A6\u30F3\u30C8\u300D\u304B\u3089\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    close: "\u9589\u3058\u308B",
    usageDetails: "\u4F7F\u7528\u91CF\u306E\u8A73\u7D30\u3092\u958B\u304F",
    refresh: "\u72B6\u614B\u3092\u66F4\u65B0",
    loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
    retry: "\u518D\u8AAD\u307F\u8FBC\u307F",
    connected: "\u63A5\u7D9A\u6E08\u307F",
    disconnected: "\u672A\u63A5\u7D9A",
    unknown: "\u672A\u78BA\u8A8D",
    unavailable: "\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093",
    stale: "\u524D\u56DE\u306E\u53D6\u5F97\u5024",
    error: "\u53D6\u5F97\u30A8\u30E9\u30FC",
    routing: "\u512A\u5148\u9806\u4F4D\u3067\u81EA\u52D5\u9078\u629E",
    routingHint: "\u30E2\u30C7\u30EB\u3092\u8A2D\u5B9A\u3057\u305F\u6709\u52B9\u306A\u4F1A\u8A71\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u3092\u4E0A\u304B\u3089\u9078\u3073\u307E\u3059\u3002\u8A8D\u8A3C\u306F\u5404\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u304C\u5B9F\u969B\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u6642\u306B\u78BA\u8A8D\u3057\u307E\u3059\u3002",
    purposeRouting: "\u7528\u9014\u5225\u306E\u30E2\u30C7\u30EB",
    purposeRoutingHint: "\u6700\u65B0\u306E\u4F9D\u983C\u5185\u5BB9\u3092\u5224\u5B9A\u3057\u3001\u6307\u5B9A\u3057\u305F\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u3092\u5148\u306B\u8A66\u3057\u307E\u3059\u3002\u5229\u7528\u3067\u304D\u306A\u3044\u5834\u5408\u306F\u901A\u5E38\u306E\u512A\u5148\u9806\u4F4D\u3078\u623B\u308A\u307E\u3059\u3002",
    autoPriority: "\u901A\u5E38\u306E\u512A\u5148\u9806\u4F4D",
    purpose_architecture: "\u8A2D\u8A08\u30FB\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3",
    purpose_research: "\u691C\u7D22\u30FB\u8ABF\u67FB",
    purpose_collaboration: "\u30EC\u30D3\u30E5\u30FC\u30FB\u5171\u540C\u4F5C\u696D",
    purpose_refactor: "\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0",
    purpose_new: "\u65B0\u898F\u5B9F\u88C5",
    purpose_medium: "\u4FEE\u6B63\u30FB\u30C7\u30D0\u30C3\u30B0",
    purpose_simple: "\u7C21\u5358\u306A\u8CEA\u554F",
    purpose_spec_driven: "\u4ED5\u69D8\u30FBRFC",
    jevTitle: "Jev \u8A55\u4FA1",
    jevType: "\u8A55\u4FA1\u30E2\u30C7\u30EB",
    jevHint: "Jev \u306F\u4F1A\u8A71\u3084\u30D6\u30E9\u30A6\u30B6\u30FC\u64CD\u4F5C\u3067\u306F\u306A\u304F\u3001\u72B6\u614B\u306E\u5206\u985E\u30FB\u30EB\u30FC\u30C6\u30A3\u30F3\u30B0\u30FB\u63A1\u70B9\u30FB\u691C\u8A3C\u306B\u4F7F\u3044\u307E\u3059\u3002darask_jev_evaluate \u30C4\u30FC\u30EB\u304C\u30BC\u30ED\u30C7\u30FC\u30BF\u4FDD\u6301\u3092\u8981\u6C42\u3057\u3066\u5B9F\u884C\u3057\u307E\u3059\u3002",
    aiGatewayApiKey: "Vercel AI Gateway API \u30AD\u30FC",
    createAiGatewayKey: "API \u30AD\u30FC\u3092\u767A\u884C",
    removeAiGatewayKey: "\u4FDD\u5B58\u6E08\u307F\u30AD\u30FC\u3092\u524A\u9664",
    deepseekApiKey: "DeepSeek\u516C\u5F0FAPI\u30AD\u30FC",
    removeDeepseekKey: "\u4FDD\u5B58\u6E08\u307FDeepSeek\u30AD\u30FC\u3092\u524A\u9664",
    deepseekHint: "DeepSeek\u516C\u5F0FAPI\u306E deepseek-v4-pro \u3092\u53F8\u4EE4\u5854\u3068\u3057\u3066\u4F7F\u3044\u307E\u3059\u3002Vercel AI Gateway\u30AD\u30FC\u306FJev\u8A55\u4FA1\u306B\u3060\u3051\u4F7F\u7528\u3057\u307E\u3059\u3002",
    bitwardenType: "\u7121\u6599\u306ESecrets Manager\u9023\u643A",
    bitwardenHint: "\u8AAD\u307F\u53D6\u308A\u5C02\u7528Machine Account\u304B\u3089\u3001\u8868\u793A\u3055\u308C\u305F5\u3064\u306ESecret Key\u3060\u3051\u3092\u5B8C\u5168\u4E00\u81F4\u3067\u81EA\u52D5\u691C\u51FA\u3057\u3066\u53D6\u5F97\u3057\u307E\u3059\u3002Machine Account\u306FDARASK\u5C02\u7528Project\u3060\u3051\u306B\u5236\u9650\u3057\u3066\u304F\u3060\u3055\u3044\u3002Password Manager\u4FDD\u7BA1\u5EAB\u30FB\u30D1\u30B9\u30EF\u30FC\u30C9\u30FBCookie\u306F\u8AAD\u307F\u53D6\u308A\u307E\u305B\u3093\u3002",
    bitwardenEnabled: "\u8D77\u52D5\u6642\u306B\u81EA\u52D5\u540C\u671F",
    bitwardenExecutable: "bws CLI\u306E\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB",
    bitwardenExecutableHint: "bws.exe\u306E\u7D76\u5BFE\u30D1\u30B9\u3092\u6307\u5B9A\u3057\u307E\u3059\u3002\u30B7\u30A7\u30EB\u3084PATH\u691C\u7D22\u306F\u4F7F\u7528\u3057\u307E\u305B\u3093\u3002",
    bitwardenToken: "Machine Account\u30A2\u30AF\u30BB\u30B9\u30C8\u30FC\u30AF\u30F3",
    bitwardenSecretId: "Secret UUID",
    bitwardenSync: "\u4ECA\u3059\u3050\u540C\u671F",
    bitwardenRemove: "Machine Account\u30C8\u30FC\u30AF\u30F3\u3092\u524A\u9664",
    bitwardenLastSync: "\u6700\u7D42\u540C\u671F",
    bitwardenBrowserRunSetup: "Cloudflare Browser Run\u306E\u8A2D\u5B9A\u65B9\u6CD5",
    bitwardenBrowserRunAccount: "Cloudflare Dashboard\u3067\u5BFE\u8C61\u30A2\u30AB\u30A6\u30F3\u30C8\u306E32\u6587\u5B57\u306EAccount ID\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3059\u3002",
    bitwardenBrowserRunToken: "\u30AB\u30B9\u30BF\u30E0API\u30C8\u30FC\u30AF\u30F3\u3092\u4F5C\u308A\u3001Account \u2192 Browser Rendering \u2192 Edit\u3060\u3051\u3092\u5BFE\u8C61\u30A2\u30AB\u30A6\u30F3\u30C8\u3078\u8A31\u53EF\u3057\u307E\u3059\u3002",
    bitwardenBrowserRunSecret: "Bitwarden\u306EDARASK Project\u306B\u3001Key\u304CDARASK_CLOUDFLARE_BROWSER_RUN\u306ESecret\u3092\u4F5C\u308A\u307E\u3059\u3002Value\u306F\u6B21\u306E1\u884CJSON\u3067\u3059\u3002",
    bitwardenBrowserRunAccess: "Machine Account\u306B\u306FDARASK Project\u306ECan read\u3060\u3051\u3092\u4ED8\u4E0E\u3057\u307E\u3059\u3002Account ID\u3068API\u30C8\u30FC\u30AF\u30F3\u3092\u5225Secret\u306B\u306F\u3057\u307E\u305B\u3093\u3002",
    bitwardenBrowserRunValue: '{"accountId":"32\u6587\u5B57\u306ECloudflare\u30A2\u30AB\u30A6\u30F3\u30C8ID","apiToken":"Browser Rendering Edit\u6A29\u9650\u306EAPI\u30C8\u30FC\u30AF\u30F3"}',
    bitwardenBrowserRunLink: "Cloudflare Browser Run\u516C\u5F0F\u624B\u9806",
    bitwardenSetup: "Bitwarden Secrets Manager\u5168\u4F53\u306E\u8A2D\u5B9A\u65B9\u6CD5",
    bitwardenSetupStep1: "Bitwarden Web\u306EAdmin Console\u3067\u7121\u6599Organization\u3092\u4F5C\u308A\u3001Billing \u2192 Subscription\u304B\u3089Secrets Manager\u3092\u6709\u52B9\u306B\u3057\u307E\u3059\u3002",
    bitwardenSetupStep2: "Secrets Manager\u3067DARASK\u5C02\u7528Project\u3092\u4F5C\u308A\u307E\u3059\u3002\u3053\u3053\u306B\u306F\u4E0B\u8A185\u9805\u76EE\u4EE5\u5916\u306ESecret\u3092\u5165\u308C\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    bitwardenSetupStep3: "\u4E0B\u8A18\u3068\u5B8C\u5168\u4E00\u81F4\u3059\u308BKey\u3067Secret\u3092\u4F5C\u308A\u3001\u5404\u30B5\u30FC\u30D3\u30B9\u304B\u3089\u53D6\u5F97\u3057\u305F\u5024\u3092Value\u3078\u4FDD\u5B58\u3057\u307E\u3059\u3002Notes\u6B04\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    bitwardenSetupStep4: "Machine Account darask-win\u3092\u4F5C\u308A\u3001DARASK Project\u3078Can read\u3060\u3051\u3092\u4ED8\u4E0E\u3057\u307E\u3059\u3002Can read, write\u306F\u4E0D\u8981\u3067\u3059\u3002",
    bitwardenSetupStep5: "Machine Account\u306EAccess Token\u3092\u767A\u884C\u3057\u3001\u3053\u306E\u753B\u9762\u306E\u30A2\u30AF\u30BB\u30B9\u30C8\u30FC\u30AF\u30F3\u6B04\u3078\u76F4\u63A5\u8CBC\u308A\u4ED8\u3051\u307E\u3059\u3002\u30C8\u30FC\u30AF\u30F3\u306F\u4F5C\u6210\u76F4\u5F8C\u306B\u5B89\u5168\u306B\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    bitwardenSetupStep6: "bws.exe\u306E\u7D76\u5BFE\u30D1\u30B9\u3092\u5165\u529B\u3057\u3001\u81EA\u52D5\u540C\u671F\u3092ON\u306B\u3057\u3066\u753B\u9762\u4E0B\u306E\u4FDD\u5B58\u3092\u62BC\u3057\u307E\u3059\u3002\u4FDD\u5B58\u5F8C\u306B\u4ECA\u3059\u3050\u540C\u671F\u3092\u5B9F\u884C\u3057\u307E\u3059\u3002",
    bitwardenSetupLink: "Bitwarden\u516C\u5F0F\u30AF\u30A4\u30C3\u30AF\u30B9\u30BF\u30FC\u30C8",
    bitwardenDeepseekSetup: "DeepSeek API\u30AD\u30FC\u306E\u53D6\u5F97\u30FB\u4FDD\u5B58\u65B9\u6CD5",
    bitwardenDeepseekStep1: "DeepSeek API Platform\u3078\u30ED\u30B0\u30A4\u30F3\u3057\u3001API Keys\u304B\u3089\u65B0\u3057\u3044API\u30AD\u30FC\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002",
    bitwardenDeepseekStep2: "\u8868\u793A\u3055\u308C\u305F\u30AD\u30FC\u3092\u305D\u306E\u5834\u3067\u30B3\u30D4\u30FC\u3057\u307E\u3059\u3002\u518D\u8868\u793A\u3067\u304D\u306A\u3044\u5834\u5408\u306F\u65B0\u3057\u3044\u30AD\u30FC\u3092\u4F5C\u308A\u3001\u53E4\u3044\u30AD\u30FC\u3092\u5931\u52B9\u3057\u307E\u3059\u3002\u5229\u7528\u306B\u306F\u6B8B\u9AD8\u3084\u8ACB\u6C42\u8A2D\u5B9A\u304C\u5FC5\u8981\u306A\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002",
    bitwardenDeepseekStep3: "Bitwarden\u306EDARASK Project\u306B\u6B21\u306EKey\u3068Value\u3067Secret\u3092\u4F5C\u308A\u307E\u3059\u3002",
    bitwardenDeepseekValue: "Key: DEEPSEEK_API_KEY / Value: DeepSeek\u3067\u767A\u884C\u3057\u305FAPI\u30AD\u30FC",
    bitwardenDeepseekLink: "DeepSeek\u516C\u5F0FAPI\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8",
    bitwardenGatewaySetup: "Vercel AI Gateway API\u30AD\u30FC\u306E\u53D6\u5F97\u30FB\u4FDD\u5B58\u65B9\u6CD5",
    bitwardenGatewayStep1: "Vercel Dashboard\u306EAI Gateway \u2192 API Keys\u3067Create key\u3092\u62BC\u3057\u3001\u7528\u9014\u304C\u5206\u304B\u308B\u540D\u524D\u3092\u4ED8\u3051\u307E\u3059\u3002",
    bitwardenGatewayStep2: "\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u4E88\u7B97\u4E0A\u9650\u3068\u66F4\u65B0\u671F\u9593\u3092\u8A2D\u5B9A\u3057\u3001\u4F5C\u6210\u76F4\u5F8C\u306B\u30AD\u30FC\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3059\u3002\u30AD\u30FC\u5024\u306F\u5F8C\u304B\u3089\u518D\u8868\u793A\u3067\u304D\u307E\u305B\u3093\u3002",
    bitwardenGatewayStep3: "Bitwarden\u306EDARASK Project\u306B\u6B21\u306EKey\u3068Value\u3067Secret\u3092\u4F5C\u308A\u307E\u3059\u3002",
    bitwardenGatewayValue: "Key: AI_GATEWAY_API_KEY / Value: Vercel AI Gateway\u3067\u767A\u884C\u3057\u305FAPI\u30AD\u30FC",
    bitwardenGatewayLink: "Vercel AI Gateway\u516C\u5F0FAPI\u30AD\u30FC\u624B\u9806",
    bitwardenR2Setup: "Cloudflare R2\u8CC7\u683C\u60C5\u5831\u306E\u53D6\u5F97\u30FB\u4FDD\u5B58\u65B9\u6CD5",
    bitwardenR2Step1: "Cloudflare Dashboard\u3067Storage & databases \u2192 R2 \u2192 Overview \u2192 Manage R2 API Tokens\u3092\u958B\u304D\u307E\u3059\u3002",
    bitwardenR2Step2: "Create Account API token\u307E\u305F\u306FCreate User API token\u3092\u9078\u3073\u3001Object Read & Write\u3092\u4ED8\u4E0E\u3057\u307E\u3059\u3002\u53EF\u80FD\u306A\u3089\u5171\u6709\u30E1\u30C7\u30A3\u30A2\u7528\u30D0\u30B1\u30C3\u30C8\u3060\u3051\u306B\u9650\u5B9A\u3057\u307E\u3059\u3002",
    bitwardenR2Step3: "\u4F5C\u6210\u5B8C\u4E86\u753B\u9762\u306EAccess Key ID\u3068Secret Access Key\u3092\u4E21\u65B9\u30B3\u30D4\u30FC\u3057\u307E\u3059\u3002Secret Access Key\u306F\u5F8C\u304B\u3089\u518D\u8868\u793A\u3067\u304D\u307E\u305B\u3093\u3002\u901A\u5E38\u306ECloudflare API Token\u3068\u306F\u5225\u7269\u3067\u3059\u3002",
    bitwardenR2Step4: "Bitwarden\u306EDARASK Project\u306B2\u3064\u306ESecret\u3092\u4F5C\u308A\u3001\u305D\u308C\u305E\u308C\u5BFE\u5FDC\u3059\u308B\u5024\u3092Value\u3078\u4FDD\u5B58\u3057\u307E\u3059\u3002",
    bitwardenR2AccessValue: "Key: DARASK_R2_ACCESS_KEY_ID / Value: R2\u306EAccess Key ID",
    bitwardenR2SecretValue: "Key: DARASK_R2_SECRET_ACCESS_KEY / Value: R2\u306ESecret Access Key",
    bitwardenR2Link: "Cloudflare R2\u516C\u5F0FAPI\u30C8\u30FC\u30AF\u30F3\u624B\u9806",
    priority: "\u4F7F\u7528\u3059\u308B\u512A\u5148\u9806\u4F4D",
    priorityHint: "\u4E0A\u307B\u3069\u512A\u5148\u3055\u308C\u307E\u3059\u3002\u5909\u66F4\u306F\u4FDD\u5B58\u5F8C\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002",
    up: "\u512A\u5148\u9806\u4F4D\u3092\u4E0A\u3052\u308B",
    down: "\u512A\u5148\u9806\u4F4D\u3092\u4E0B\u3052\u308B",
    enabled: "\u4F7F\u7528\u3059\u308B",
    disabled: "\u7121\u52B9",
    login: "\u30ED\u30B0\u30A4\u30F3",
    logout: "\u30ED\u30B0\u30A2\u30A6\u30C8",
    cancelLogin: "\u30ED\u30B0\u30A4\u30F3\u3092\u4E2D\u6B62",
    loginPending: "\u30ED\u30B0\u30A4\u30F3\u3092\u5F85\u3063\u3066\u3044\u307E\u3059",
    openLogin: "\u8A8D\u8A3C\u30DA\u30FC\u30B8\u3092\u958B\u304F",
    userCode: "\u8A8D\u8A3C\u30B3\u30FC\u30C9",
    openrouterCallbackToggle: "\u623B\u308A\u5148 URL \u3067\u8A8D\u8A3C\u3092\u5B8C\u4E86",
    openrouterCallbackHelp: "\u8A8D\u8A3C\u5F8C\u306B\u300C\u30DA\u30FC\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u300D\u3068\u51FA\u305F\u3089\u3001\u30A2\u30C9\u30EC\u30B9\u6B04\u306E URL \u5168\u4F53\u3092\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002code \u3068 state \u3092\u542B\u3080\u4ECA\u56DE\u306E\u623B\u308A\u5148\u3060\u3051\u3092\u4F7F\u3044\u307E\u3059\u3002",
    openrouterCallbackLabel: "\u8A8D\u8A3C\u5F8C\u306E\u623B\u308A\u5148 URL",
    openrouterCallbackSubmit: "\u8A8D\u8A3C\u3092\u5B8C\u4E86",
    settings: "\u63A5\u7D9A\u30FB\u30E2\u30C7\u30EB\u8A2D\u5B9A",
    model: "\u30E2\u30C7\u30EB",
    modelVisibility: "\u30E2\u30C7\u30EB\u9078\u629E\u306B\u8868\u793A",
    modelVisibilityHint: "\u8868\u793A\u3059\u308B\u30E2\u30C7\u30EB\u3092\u5207\u308A\u66FF\u3048\u307E\u3059\u3002\u975E\u8868\u793A\u306B\u3057\u3066\u3082\u65E2\u5B58\u306E\u4F1A\u8A71\u3067\u306F\u5F15\u304D\u7D9A\u304D\u5229\u7528\u3067\u304D\u307E\u3059\u3002",
    executable: "CLI \u306E\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB",
    executableHint: "\u30B5\u30FC\u30D3\u30B9\u3054\u3068\u306E\u7D76\u5BFE\u30D1\u30B9\u3092\u6307\u5B9A\u3057\u307E\u3059\u3002Grok \u3068 Cursor \u3067\u540C\u3058 agent \u30B3\u30DE\u30F3\u30C9\u3092\u5171\u6709\u3057\u307E\u305B\u3093\u3002",
    account: "\u30A2\u30AB\u30A6\u30F3\u30C8",
    usage: "\u4F7F\u7528\u72B6\u6CC1",
    remaining: "\u6B8B\u308A",
    used: "\u4F7F\u7528\u6E08\u307F",
    resets: "\u30EA\u30BB\u30C3\u30C8",
    unlimited: "\u4E0A\u9650\u306A\u3057",
    logoutConfirm: "Grok CLI \u304B\u3089\u3082\u30ED\u30B0\u30A2\u30A6\u30C8",
    logoutConfirmHint: "Grok CLI \u306E\u30ED\u30B0\u30A4\u30F3\u72B6\u614B\u3082\u89E3\u9664\u3055\u308C\u307E\u3059\u3002\u7D9A\u3051\u308B\u5834\u5408\u306F30\u79D2\u4EE5\u5185\u306B\u3082\u3046\u4E00\u5EA6\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    credit: "\u30AF\u30EC\u30B8\u30C3\u30C8",
    individualLimit: "\u500B\u4EBA\u306E\u5229\u7528\u4E0A\u9650",
    limit: "\u4E0A\u9650",
    seconds: "\u79D2",
    source: "\u53D6\u5F97\u5143",
    updated: "\u53D6\u5F97\u65E5\u6642",
    unknownUsage: "\u3053\u306E\u30B5\u30FC\u30D3\u30B9\u306F\u4F7F\u7528\u91CF\u3092\u8FD4\u3057\u3066\u3044\u307E\u305B\u3093\u3002",
    keyAllowance: "API \u30AD\u30FC\u306E\u4E0A\u9650\u6B8B\u984D",
    keyUsage: "\u3053\u306E API \u30AD\u30FC\u306E\u4F7F\u7528\u984D",
    daily: "\u4ECA\u65E5",
    weekly: "\u4ECA\u9031",
    monthly: "\u4ECA\u6708",
    modelProvider: "\u4F1A\u8A71\u30E2\u30C7\u30EB",
    cliProvider: "CLI \u3078\u306E\u4F5C\u696D\u59D4\u4EFB",
    grokProvider: "\u4F1A\u8A71\u30E2\u30C7\u30EB\u30FBCLI \u3078\u306E\u4F5C\u696D\u59D4\u4EFB",
    cliHint: "\u3053\u306E\u30B5\u30FC\u30D3\u30B9\u306F darask_agent \u30C4\u30FC\u30EB\u304B\u3089\u4F5C\u696D\u3092\u59D4\u4EFB\u3057\u307E\u3059\u3002\u901A\u5E38\u306E\u4F1A\u8A71\u30E2\u30C7\u30EB\u306E\u81EA\u52D5\u9078\u629E\u306B\u306F\u542B\u307E\u308C\u307E\u305B\u3093\u3002",
    claudeHint: "Claude \u306E\u5951\u7D04\u30ED\u30B0\u30A4\u30F3\u5F8C\u3001\u30BB\u30C3\u30B7\u30E7\u30F3\u53F3\u4E0B\u306E\u30E2\u30C7\u30EB\u9078\u629E\u306B Claude \u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002darask_agent \u304B\u3089\u3082\u59D4\u4EFB\u3067\u304D\u307E\u3059\u3002",
    modelHint: "\u3053\u306E\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u304C\u53D7\u3051\u4ED8\u3051\u308B\u30E2\u30C7\u30EB ID \u3092\u6307\u5B9A\u3057\u307E\u3059\u3002",
    openaiModelHint: "\u53F8\u4EE4\u5854\u306F\u5927\u578B\u7D44\u306E gpt-5.6-sol\u3002\u5B9F\u4F5C\u696D\u306E Fusion \u5074\u306F\u5C0F\u578B\u7D44\u306E gpt-5.6-luna \u3067\u3059\u3002gpt-6-astra \u306A\u3069\u30EA\u30B9\u30C8\u5916\u306F\u6709\u6599\u3067\u3059\u3002",
    openaiHint: "ChatGPT \u306E\u30B5\u30D6\u30B9\u30AF\u3067\u306F\u306A\u304F\u3001platform.openai.com \u306E API \u30AD\u30FC\u3067\u3059\u3002\u30C7\u30FC\u30BF\u5171\u6709\u3092\u30AA\u30F3\u306B\u3057\u305F\u7D44\u7E54\u3060\u3051\u304C\u65E5\u6B21\u306E\u7121\u6599\u30C8\u30FC\u30AF\u30F3\u3092\u53D7\u3051\u53D6\u308C\u307E\u3059\u3002",
    openaiDangerTitle: "\u30C7\u30FC\u30BF\u5171\u6709\u306E\u5371\u967A",
    openaiDanger: "\u7121\u6599\u30C8\u30FC\u30AF\u30F3\u3092\u4F7F\u3046\u306B\u306F\u3001\u305D\u306E\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E API \u5165\u51FA\u529B\u3092 OpenAI \u306E\u5B66\u7FD2\u306B\u6E21\u3057\u307E\u3059\u3002\u9867\u5BA2\u30C7\u30FC\u30BF\u30FB\u6A5F\u5BC6\u30FB\u500B\u4EBA\u60C5\u5831\u304C\u3042\u308B\u901A\u4FE1\u3067\u306F\u30AA\u30F3\u306B\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002DARASK \u306F\u3053\u306E\u30B9\u30A4\u30C3\u30C1\u3092\u4EE3\u308F\u308A\u306B\u5165\u308C\u307E\u305B\u3093\u3002",
    openaiDangerMore: "\u67A0\u3092\u8D85\u3048\u305F\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u5206\u5272\u3055\u308C\u305A\u3001\u305D\u306E\u56DE\u306E\u30C8\u30FC\u30AF\u30F3\u304C\u3059\u3079\u3066\u6709\u6599\u306B\u306A\u308A\u307E\u3059\u3002\u6B8B\u9AD8\u304C 0 \u3060\u3068\u7121\u6599\u67A0\u304C\u6B8B\u3063\u3066\u3044\u3066\u3082\u547C\u3079\u307E\u305B\u3093\u3002Fine-tune\u30FB\u4E00\u90E8\u306E tool use\u30FBZDR \u306F\u5BFE\u8C61\u5916\u3067\u3059\u3002\u7121\u6599\u30C8\u30FC\u30AF\u30F3\u3068 RPM/TPM \u306F\u5225\u3067\u3059\u3002",
    openaiDataControls: "OpenAI \u306E\u30C7\u30FC\u30BF\u5171\u6709\u8A2D\u5B9A\u3092\u958B\u304F",
    openaiApiKey: "OpenAI API \u30AD\u30FC",
    openaiAdminKey: "OpenAI \u7BA1\u7406\u30AD\u30FC\uFF08\u5229\u7528\u72B6\u6CC1\u3001\u4EFB\u610F\uFF09",
    openaiAdminHint: "\u65E5\u6B21\u306E\u7121\u6599\u30C8\u30FC\u30AF\u30F3\u4F7F\u7528\u91CF\u306F\u7D44\u7E54\u306E Usage API \u7528\u306E\u7BA1\u7406\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u30AD\u30FC\u3060\u3051\u3067\u306F\u6B8B\u91CF\u3092\u63A8\u5B9A\u3057\u307E\u305B\u3093\u3002",
    openaiTier: "Usage tier\uFF08\u7121\u6599\u67A0\u306E\u5927\u304D\u3055\uFF09",
    openaiTierUnknown: "\u672A\u78BA\u8A8D\uFF08\u6B8B\u91CF%\u306F\u51FA\u3055\u306A\u3044\uFF09",
    openaiTier12: "Tier 1\u20132\uFF08\u5927\u578B 25\u4E07 / \u5C0F\u578B 250\u4E07\uFF09",
    openaiTier35: "Tier 3\u20135\uFF08\u5927\u578B 100\u4E07 / \u5C0F\u578B 1000\u4E07\uFF09",
    openaiPrefer: "\u7121\u6599\u30C8\u30FC\u30AF\u30F3\u67A0\u3092\u512A\u5148\u3059\u308B",
    openaiPreferHint: "\u5BFE\u8C61\u30E2\u30C7\u30EB\u306E\u7121\u6599\u67A0\u304C\u5C3D\u304D\u305F\u3068\u304D\u3001\u81EA\u52D5\u9078\u629E\u306F\u3053\u306E API \u3092\u98DB\u3070\u3057\u307E\u3059\u3002\u6B8B\u91CF\u304C\u672A\u77E5\u306E\u3068\u304D\u306F\u98DB\u3070\u3057\u307E\u305B\u3093\u3002\u512A\u5148\u9806\u4F4D\u306E\u4E00\u756A\u4E0A\u306B\u7F6E\u3044\u3066\u300C\u512A\u5148\u9806\u4F4D\u3067\u81EA\u52D5\u9078\u629E\u300D\u3092\u30AA\u30F3\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    complimentaryUsage: "\u4ECA\u65E5\u306E\u7121\u6599\u30C8\u30FC\u30AF\u30F3\uFF08\u30C7\u30FC\u30BF\u5171\u6709\u30A4\u30F3\u30BB\u30F3\u30C6\u30A3\u30D6\uFF09",
    creditHint: "\u30B5\u30FC\u30D3\u30B9\u3054\u3068\u306E\u6B8B\u9AD8\u3092\u8868\u793A\u3057\u307E\u3059\u3002\u7570\u306A\u308B\u30A2\u30AB\u30A6\u30F3\u30C8\u30FB\u5358\u4F4D\u306E\u6B8B\u9AD8\u306F\u5408\u7B97\u3057\u307E\u305B\u3093\u3002",
    apiKey: "OpenRouter API \u30AD\u30FC",
    managementKey: "OpenRouter \u7BA1\u7406\u30AD\u30FC\uFF08\u4EFB\u610F\uFF09",
    keyHint: "\u65B0\u3057\u3044\u30AD\u30FC\u3092\u5165\u529B\u3059\u308B\u3068\u4FDD\u5B58\u6642\u306B\u66F4\u65B0\u3057\u307E\u3059\u3002\u4FDD\u5B58\u6E08\u307F\u306E\u30AD\u30FC\u306F\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    save: "\u5909\u66F4\u3092\u4FDD\u5B58",
    discard: "\u5909\u66F4\u3092\u623B\u3059",
    unsaved: "\u672A\u4FDD\u5B58\u306E\u5909\u66F4",
    saved: "\u4FDD\u5B58\u3057\u307E\u3057\u305F",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    failed: "\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
    loadFailed: "\u72B6\u614B\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    noProviders: "\u30B5\u30FC\u30D3\u30B9\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002",
    compatibility: "\u5B9F\u884C\u74B0\u5883",
    dateLocale: "ja-JP",
    configuration: "\u8A2D\u5B9A",
    integrations: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3068\u30D6\u30E9\u30A6\u30B6",
    serveOn: "Tailscale \u5185\u3067 DSH \u3092\u5171\u6709",
    serveOff: "DSH \u306E\u5171\u6709\u3092\u505C\u6B62",
    tailHint: "\u540C\u3058 Tailscale \u306E PC \u540C\u58EB\u3092 HTTPS \u3067\u63A5\u7D9A\u3057\u307E\u3059\u3002\u5171\u6709\u3092\u958B\u59CB\u3057\u305F\u3089\u3001\u4E0B\u306E QR \u304B\u3089\u767B\u9332\u3067\u304D\u307E\u3059\u3002",
    serveConflict: "\u3053\u306E\u30DD\u30FC\u30C8\u306B\u306F\u65E2\u5B58\u306E\u8A2D\u5B9A\u304C\u3042\u308A\u307E\u3059\u3002",
    serveStopped: "\u5171\u6709\u306F\u505C\u6B62\u4E2D",
    serveActive: "\u5171\u6709\u4E2D",
    computerTitle: "PC \u753B\u9762\u306E\u64CD\u4F5C",
    computerHint: "\u3053\u306E PC \u306E\u753B\u9762\u3092\u898B\u3066\u3001\u30DE\u30A6\u30B9\u3068\u30AD\u30FC\u30DC\u30FC\u30C9\u3067\u64CD\u4F5C\u3057\u307E\u3059\u3002\u521D\u671F\u72B6\u614B\u306F\u30AA\u30D5\u3067\u3059\u3002\u30ED\u30C3\u30AF\u753B\u9762\u30FBUAC\u30FB\u672A\u77E5\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u6B04\u306B\u306F\u4F7F\u3044\u307E\u305B\u3093\u3002",
    computerOn: "\u753B\u9762\u64CD\u4F5C\u3092\u6709\u52B9\u306B\u3059\u308B",
    computerOff: "\u753B\u9762\u64CD\u4F5C\u3092\u505C\u6B62",
    computerReady: "\u6709\u52B9\u30FB\u30C4\u30FC\u30EB\u304B\u3089\u5229\u7528\u53EF",
    computerUnavailable: "\u3053\u306E OS \u3067\u306F\u753B\u9762\u64CD\u4F5C\u306B\u672A\u5BFE\u5FDC\u3067\u3059\u3002",
    gameProfile: "\u30B2\u30FC\u30E0\u8D77\u52D5\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB",
    gameProfileHint: "\u3053\u306E PC \u3067\u8A31\u53EF\u3059\u308B\u30B2\u30FC\u30E0\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB\u3092\u4E00\u3064\u8A2D\u5B9A\u3057\u307E\u3059\u3002\u30E2\u30C7\u30EB\u3084\u30EA\u30E2\u30FC\u30C8PC\u304B\u3089\u4EFB\u610F\u306E\u30B3\u30DE\u30F3\u30C9\u306F\u6307\u5B9A\u3067\u304D\u307E\u305B\u3093\u3002\u4E21\u65B9\u306EPC\u3067\u540C\u3058\u30B2\u30FC\u30E0\u540D\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    gameName: "\u30B2\u30FC\u30E0\u540D",
    gameExecutable: "\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB\uFF08\u7D76\u5BFE\u30D1\u30B9\uFF09",
    gameArguments: "\u8D77\u52D5\u5F15\u6570\uFF081 \u884C\u306B 1 \u3064\uFF09",
    gameWorkingDirectory: "\u4F5C\u696D\u30D5\u30A9\u30EB\u30C0\u30FC\uFF08\u4EFB\u610F\uFF09",
    gameWindowTitle: "\u30B2\u30FC\u30E0\u30A6\u30A3\u30F3\u30C9\u30A6\u540D\uFF08\u4EFB\u610F\uFF09",
    gameSave: "\u8D77\u52D5\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58",
    browserHint: "\u65E2\u5B9A\u306E\u30D6\u30E9\u30A6\u30B6\u306F Kitesurf \u3067\u3059\u3002\u516C\u958B HTTPS \u30DA\u30FC\u30B8\u3092\u64CD\u4F5C\u3057\u307E\u3059\u3002\u30ED\u30FC\u30AB\u30EB\u3084 Tailscale \u5185\u306E\u30DA\u30FC\u30B8\u306B\u306F\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002",
    browserRunHint: "Browser Run \u3092\u6307\u5B9A\u3057\u305F\u4F5C\u696D\u3067\u3001\u5BFE\u8A71\u64CD\u4F5C\u30FB\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u30FBPDF\u30FB\u672C\u6587\u53D6\u5F97\u3092\u4F7F\u3048\u307E\u3059\u3002Browser Rendering \u2014 Edit \u6A29\u9650\u306E API \u30C8\u30FC\u30AF\u30F3\u3092\u767B\u9332\u3057\u307E\u3059\u3002",
    cfAccount: "Cloudflare \u30A2\u30AB\u30A6\u30F3\u30C8 ID",
    cfToken: "Browser Run API \u30C8\u30FC\u30AF\u30F3",
    connectSave: "\u63A5\u7D9A\u60C5\u5831\u3092\u4FDD\u5B58",
    disconnectRemove: "\u63A5\u7D9A\u60C5\u5831\u3092\u524A\u9664",
    configured: "\u8A2D\u5B9A\u6E08\u307F\u30FB\u5B9F\u884C\u6642\u306B\u8A8D\u8A3C",
    dashboard: "Cloudflare \u3067\u4F7F\u7528\u91CF\u3092\u78BA\u8A8D",
    observedTime: "\u3053\u306E\u8D77\u52D5\u4E2D\u306B\u53D6\u5F97\u3057\u305F Quick Actions \u4F7F\u7528\u6642\u9593",
    browserUsageHint: "Cloudflare \u5168\u4F53\u306E\u4F7F\u7528\u91CF\u30FB\u6B8B\u67A0\u306F\u7BA1\u7406\u753B\u9762\u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002\u3053\u3053\u3067\u306F\u5FDC\u7B54\u306B\u542B\u307E\u308C\u305F\u4F7F\u7528\u6642\u9593\u3060\u3051\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    localTitle: "\u30ED\u30FC\u30AB\u30EB\u30E2\u30C7\u30EB",
    startLocal: "\u30E2\u30C7\u30EB\u3092\u8D77\u52D5",
    stopLocal: "\u30E2\u30C7\u30EB\u3092\u505C\u6B62",
    localStarting: "\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
    testLocal: "\u63A5\u7D9A\u3092\u30C6\u30B9\u30C8",
    localTesting: "\u30C6\u30B9\u30C8\u4E2D\u2026",
    localTestOk: "\u77ED\u3044\u5FDC\u7B54\u3092\u78BA\u8A8D\u3057\u307E\u3057\u305F",
    localTestReply: "\u5FDC\u7B54",
    localProgress: "\u8D77\u52D5\u306E\u9032\u6357",
    localReady: "\u63A8\u8AD6\u306E\u6E96\u5099\u304C\u3067\u304D\u307E\u3057\u305F",
    localLoadingWeights: "\u91CD\u307F\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D",
    localServing: "API \u306E\u5F85\u53D7\u3092\u958B\u59CB\u3057\u307E\u3057\u305F",
    localElapsed: "\u7D4C\u904E",
    localPhaseStopped: "\u505C\u6B62\u4E2D",
    localRemoteNoStart: "\u3053\u306E URL \u306E\u8D77\u52D5\u306F\u76F8\u624B\u306E PC \u3067\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
    localHint: "Windows \u3067\u4F7F\u3046\u3068\u304D\u3060\u3051\u8D77\u52D5\u3057\u307E\u3059\u3002UNSEEN Gemma 4 \u306E Q4_K_M GGUF \u3068 llama-server.exe \u306E\u7D76\u5BFE\u30D1\u30B9\u3092\u4FDD\u5B58\u3057\u3001\u4F1A\u8A71\u306E\u76F4\u524D\u306B\u300C\u30E2\u30C7\u30EB\u3092\u8D77\u52D5\u300D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5E38\u6642\u8D77\u52D5 PC \u306B\u306F\u7F6E\u304D\u307E\u305B\u3093\u3002",
    localUrl: "\u30ED\u30FC\u30AB\u30EB API \u306E URL",
    localFile: "GGUF \u30D5\u30A1\u30A4\u30EB",
    localContext: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u9577",
    localGpu: "GPU \u306B\u8F09\u305B\u308B\u5C64\u6570",
    localAuto: "DSH \u3068\u4E00\u7DD2\u306B\u8D77\u52D5",
    localSaveHint: "\u8D77\u52D5\u3059\u308B\u524D\u306B\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5B9F\u884C\u8A2D\u5B9A\u306E\u5909\u66F4\u6642\u306F\u30E2\u30C7\u30EB\u3092\u505C\u6B62\u3057\u307E\u3059\u3002",
    localPrompt: "\u51E6\u7406\u3057\u305F\u5165\u529B\u30C8\u30FC\u30AF\u30F3",
    localGenerated: "\u751F\u6210\u3057\u305F\u30C8\u30FC\u30AF\u30F3",
    localLog: "\u5B9F\u884C\u30ED\u30B0",
    restartTitle: "DSH \u3092\u518D\u8D77\u52D5",
    restartDesc: "\u73FE\u5728\u306E\u30D7\u30ED\u30BB\u30B9\u3092\u7D42\u4E86\u3057\u3066\u7ACB\u3061\u4E0A\u3052\u76F4\u3057\u307E\u3059\u3002\u5B9F\u884C\u4E2D\u306E\u30BF\u30B9\u30AF\u3092\u7D42\u3048\u3066\u304B\u3089\u64CD\u4F5C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    restartNow: "\u518D\u8D77\u52D5",
    restarting: "\u518D\u8D77\u52D5\u3092\u9001\u3063\u3066\u3044\u307E\u3059\u2026",
    restartReconnect: "\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002\u518D\u63A5\u7D9A\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u2026",
    restartTimeout: "\u518D\u63A5\u7D9A\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u624B\u52D5\u3067\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    restartFailed: "\u518D\u8D77\u52D5\u3092\u958B\u59CB\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    localKey: "\u63A8\u8AD6 API \u30AD\u30FC\uFF08\u4EFB\u610F\uFF09",
    remoteHint: "Tailscale \u306E API \u306B\u63A5\u7D9A\u3059\u308B\u5834\u5408\u306F HTTPS \u306E *.ts.net/v1 \u307E\u305F\u306F http://100.x.x.x:\u30DD\u30FC\u30C8/v1 \u3092\u6307\u5B9A\u3057\u307E\u3059\u3002\u8D77\u52D5\u30FB\u505C\u6B62\u306F\u76F8\u624B\u306E PC \u3067\u7BA1\u7406\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  },
  en: {
    title: "Accounts",
    description: "Manage sign-in, connections, and provider priority. Usage and remaining allowances appear above Settings in the sidebar.",
    aiTab: "AI accounts",
    pcTab: "PCs & Tailscale",
    browserTab: "Browsers & computer use",
    accountTabs: "Account categories",
    usageTitle: "Usage",
    usageEmpty: "No usage data is available yet. Sign in under Settings \u2192 Accounts.",
    close: "Close",
    usageDetails: "Open usage details",
    refresh: "Refresh usage",
    loading: "Loading\u2026",
    retry: "Reload",
    connected: "Connected",
    disconnected: "Not connected",
    unknown: "Not checked",
    unavailable: "Unavailable",
    stale: "Last known value",
    error: "Unable to retrieve",
    routing: "Select by priority",
    routingHint: "Choose enabled conversation providers with configured models from the top. Each provider checks authorization when a request is sent.",
    purposeRouting: "Models by purpose",
    purposeRoutingHint: "Classify the latest request and try the selected provider first. Unavailable providers fall back to normal priority.",
    autoPriority: "Normal priority",
    purpose_architecture: "Architecture and design",
    purpose_research: "Search and research",
    purpose_collaboration: "Review and collaboration",
    purpose_refactor: "Refactoring",
    purpose_new: "New implementation",
    purpose_medium: "Fixes and debugging",
    purpose_simple: "Simple questions",
    purpose_spec_driven: "Specifications and RFCs",
    jevTitle: "Jev evaluation",
    jevType: "Evaluation model",
    jevHint: "Jev is for classification, routing, scoring, and verification\u2014not conversation or browser control. The darask_jev_evaluate tool requests zero data retention.",
    aiGatewayApiKey: "Vercel AI Gateway API key",
    createAiGatewayKey: "Create API key",
    removeAiGatewayKey: "Remove stored key",
    deepseekApiKey: "Official DeepSeek API key",
    removeDeepseekKey: "Remove stored DeepSeek key",
    deepseekHint: "Uses deepseek-v4-pro through the official DeepSeek API as the lead. The Vercel AI Gateway key is used only for Jev evaluation.",
    bitwardenType: "Free Secrets Manager integration",
    bitwardenHint: "Automatically discovers and retrieves only the five displayed Secret Keys by exact name from a read-only Machine Account. Restrict the Machine Account to a DARASK-only project. It never reads Password Manager vault items, passwords, or cookies.",
    bitwardenEnabled: "Sync automatically at startup",
    bitwardenExecutable: "bws CLI executable",
    bitwardenExecutableHint: "Enter the absolute path to bws. Shell and PATH lookup are not used.",
    bitwardenToken: "Machine Account access token",
    bitwardenSecretId: "Secret UUID",
    bitwardenSync: "Sync now",
    bitwardenRemove: "Remove Machine Account token",
    bitwardenLastSync: "Last sync",
    bitwardenBrowserRunSetup: "Configure Cloudflare Browser Run",
    bitwardenBrowserRunAccount: "Copy the 32-character Account ID for the target account from the Cloudflare dashboard.",
    bitwardenBrowserRunToken: "Create a custom API token that grants only Account \u2192 Browser Rendering \u2192 Edit for the target account.",
    bitwardenBrowserRunSecret: "In the DARASK project in Bitwarden, create a Secret whose Key is DARASK_CLOUDFLARE_BROWSER_RUN. Its Value is the following one-line JSON.",
    bitwardenBrowserRunAccess: "Grant the Machine Account only Can read on the DARASK project. Do not split the Account ID and API token into separate Secrets.",
    bitwardenBrowserRunValue: '{"accountId":"32-character Cloudflare Account ID","apiToken":"API token with Browser Rendering Edit"}',
    bitwardenBrowserRunLink: "Official Cloudflare Browser Run guide",
    bitwardenSetup: "Configure Bitwarden Secrets Manager",
    bitwardenSetupStep1: "Create a free organization in the Bitwarden Web Admin Console and enable Secrets Manager under Billing \u2192 Subscription.",
    bitwardenSetupStep2: "Create a DARASK-only project in Secrets Manager. Do not place secrets other than the five entries below in this project.",
    bitwardenSetupStep3: "Create Secrets whose Keys exactly match the names below and store each service credential in Value, not Notes.",
    bitwardenSetupStep4: "Create the darask-win Machine Account and grant it only Can read on the DARASK project. Can read, write is unnecessary.",
    bitwardenSetupStep5: "Create a Machine Account Access Token and paste it directly into the token field on this screen. Store it securely when it is first shown.",
    bitwardenSetupStep6: "Enter the absolute bws.exe path, enable automatic sync, and select Save at the bottom of the screen. Then select Sync now.",
    bitwardenSetupLink: "Official Bitwarden quick start",
    bitwardenDeepseekSetup: "Get and store a DeepSeek API key",
    bitwardenDeepseekStep1: "Sign in to the DeepSeek API Platform and create a new key under API Keys.",
    bitwardenDeepseekStep2: "Copy the key when it is shown. If it cannot be displayed again, create a replacement and revoke the old key. Balance or billing setup may be required.",
    bitwardenDeepseekStep3: "Create a Secret in the DARASK project in Bitwarden with the following Key and Value.",
    bitwardenDeepseekValue: "Key: DEEPSEEK_API_KEY / Value: API key issued by DeepSeek",
    bitwardenDeepseekLink: "Official DeepSeek API documentation",
    bitwardenGatewaySetup: "Get and store a Vercel AI Gateway API key",
    bitwardenGatewayStep1: "In the Vercel dashboard, open AI Gateway \u2192 API Keys, select Create key, and give it a recognizable name.",
    bitwardenGatewayStep2: "Optionally set a budget and refresh period, then copy the key immediately after creation. Its value cannot be displayed again.",
    bitwardenGatewayStep3: "Create a Secret in the DARASK project in Bitwarden with the following Key and Value.",
    bitwardenGatewayValue: "Key: AI_GATEWAY_API_KEY / Value: API key issued by Vercel AI Gateway",
    bitwardenGatewayLink: "Official Vercel AI Gateway API key guide",
    bitwardenR2Setup: "Get and store Cloudflare R2 credentials",
    bitwardenR2Step1: "In the Cloudflare dashboard, open Storage & databases \u2192 R2 \u2192 Overview \u2192 Manage R2 API Tokens.",
    bitwardenR2Step2: "Create an Account or User API token with Object Read & Write. Restrict it to the shared-media bucket when possible.",
    bitwardenR2Step3: "Copy both the Access Key ID and Secret Access Key from the completion screen. The Secret Access Key cannot be displayed again. These differ from an ordinary Cloudflare API token.",
    bitwardenR2Step4: "Create two Secrets in the DARASK project in Bitwarden and store each credential in the corresponding Value.",
    bitwardenR2AccessValue: "Key: DARASK_R2_ACCESS_KEY_ID / Value: R2 Access Key ID",
    bitwardenR2SecretValue: "Key: DARASK_R2_SECRET_ACCESS_KEY / Value: R2 Secret Access Key",
    bitwardenR2Link: "Official Cloudflare R2 API token guide",
    priority: "Provider priority",
    priorityHint: "Higher providers are preferred. Save to apply changes.",
    up: "Raise priority",
    down: "Lower priority",
    enabled: "Enabled",
    disabled: "Disabled",
    login: "Log in",
    logout: "Log out",
    cancelLogin: "Cancel login",
    loginPending: "Waiting for login",
    openLogin: "Open authorization page",
    userCode: "Authorization code",
    openrouterCallbackToggle: "Finish with the return URL",
    openrouterCallbackHelp: "If the browser shows page not found after OpenRouter login, paste the full address bar URL here. Use only this attempt\u2019s callback, including code and state.",
    openrouterCallbackLabel: "Callback URL after sign-in",
    openrouterCallbackSubmit: "Complete sign-in",
    settings: "Connection and model settings",
    model: "Model",
    modelVisibility: "Show in model selectors",
    modelVisibilityHint: "Choose the models shown in selectors. Hidden models remain available to existing conversations.",
    executable: "CLI executable",
    executableHint: "Use a separate absolute path for each service. Grok and Cursor never share an ambiguous agent command.",
    account: "Account",
    usage: "Usage",
    remaining: "Remaining",
    used: "Used",
    resets: "Resets",
    unlimited: "Unlimited",
    logoutConfirm: "Also log out of Grok CLI",
    logoutConfirmHint: "This also signs out the official Grok CLI. Press again within 30 seconds to continue.",
    credit: "Credits",
    individualLimit: "Individual allowance",
    limit: "Limit",
    seconds: "s",
    source: "Source",
    updated: "Updated",
    unknownUsage: "This service has not returned usage data.",
    keyAllowance: "API key allowance remaining",
    keyUsage: "Usage for this API key",
    daily: "Today",
    weekly: "This week",
    monthly: "This month",
    modelProvider: "Conversation model",
    cliProvider: "CLI delegation",
    grokProvider: "Conversation model and CLI delegation",
    cliHint: "Delegate work to this service through the darask_agent tool. It is not included in automatic conversation model selection.",
    claudeHint: "After Claude subscription sign-in, Claude models appear in the session picker. You can also delegate through darask_agent.",
    modelHint: "Enter a model ID accepted by this provider.",
    openaiModelHint: "Lead with gpt-5.6-sol (large complimentary bucket). Fusion execution uses gpt-5.6-luna (small bucket). Models such as gpt-6-astra are billed.",
    openaiHint: "This is a platform.openai.com API key, not a ChatGPT subscription. Complimentary daily tokens require data sharing on the organization.",
    openaiDangerTitle: "Data-sharing risk",
    openaiDanger: "Complimentary tokens require sharing that project\u2019s API inputs and outputs with OpenAI for training. Do not enable this on customer, secret, or personal data. DARASK cannot turn sharing on for you.",
    openaiDangerMore: "A request that crosses the remaining allotment is billed in full. A zero balance still blocks calls. Fine-tunes, some tool use, and ZDR are excluded. Complimentary tokens are separate from RPM/TPM.",
    openaiDataControls: "Open OpenAI data-sharing settings",
    openaiApiKey: "OpenAI API key",
    openaiAdminKey: "OpenAI admin key (usage, optional)",
    openaiAdminHint: "Daily complimentary usage needs an organization admin key. A project key alone never invents remaining percent.",
    openaiTier: "Usage tier (complimentary size)",
    openaiTierUnknown: "Unknown (do not show remaining %)",
    openaiTier12: "Tier 1\u20132 (250k large / 2.5M small)",
    openaiTier35: "Tier 3\u20135 (1M large / 10M small)",
    openaiPrefer: "Prefer complimentary tokens",
    openaiPreferHint: "When that model\u2019s complimentary bucket is exhausted, automatic routing skips this API. Unknown remaining is never treated as zero. Put OpenAI first and turn on priority routing.",
    complimentaryUsage: "Complimentary tokens today (data-sharing incentive)",
    creditHint: "Balances are shown per service. Different accounts and credit units are not added together.",
    apiKey: "OpenRouter API key",
    managementKey: "OpenRouter management key (optional)",
    keyHint: "Enter a new key to replace it when saving. Stored keys are never displayed.",
    save: "Save changes",
    discard: "Discard changes",
    unsaved: "Unsaved changes",
    saved: "Saved",
    saving: "Saving\u2026",
    failed: "The action failed.",
    loadFailed: "Unable to load provider status.",
    noProviders: "No providers are registered.",
    compatibility: "Runtime",
    dateLocale: "en-US",
    configuration: "Configuration",
    integrations: "Network and browsers",
    serveOn: "Share DSH with the tailnet",
    serveOff: "Stop sharing DSH",
    tailHint: "Share DSH within this Tailscale network over HTTPS port 8443. Use the startup helper and authenticate with your DSH access token.",
    serveConflict: "This port has an existing configuration.",
    serveStopped: "Sharing stopped",
    serveActive: "Sharing active",
    computerTitle: "PC screen control",
    computerHint: "Let the agent screenshot this PC and use the mouse and keyboard. Off by default. Do not use it on lock, UAC, or unknown password prompts.",
    computerOn: "Enable screen control",
    computerOff: "Disable screen control",
    computerReady: "Enabled; available to tools",
    computerUnavailable: "Screen control is not available on this OS.",
    gameProfile: "Game launch profile",
    gameProfileHint: "Configure one game executable allowed on this PC. Models and remote PCs cannot supply arbitrary commands. Use the same game name on both PCs.",
    gameName: "Game name",
    gameExecutable: "Executable (absolute path)",
    gameArguments: "Launch arguments (one per line)",
    gameWorkingDirectory: "Working directory (optional)",
    gameWindowTitle: "Game window title (optional)",
    gameSave: "Save launch profile",
    browserHint: "Kitesurf is the default browser for public HTTPS pages. It cannot reach localhost or private tailnet pages.",
    browserRunHint: "Select Browser Run for interactive automation, screenshots, PDFs, and page extraction. Register a token with Browser Rendering \u2014 Edit permission.",
    cfAccount: "Cloudflare account ID",
    cfToken: "Browser Run API token",
    connectSave: "Save connection",
    disconnectRemove: "Remove connection",
    configured: "Configured; verified on use",
    dashboard: "View Cloudflare usage",
    observedTime: "Quick Actions time observed during this startup",
    browserUsageHint: "See the Cloudflare dashboard for account usage and remaining allowances. Only reported request time is shown here.",
    localTitle: "Local model",
    startLocal: "Start model",
    stopLocal: "Stop model",
    localStarting: "Loading model\u2026",
    testLocal: "Test connection",
    localTesting: "Testing\u2026",
    localTestOk: "Received a short reply",
    localTestReply: "Reply",
    localProgress: "Startup progress",
    localReady: "Ready for inference",
    localLoadingWeights: "Loading weights",
    localServing: "API is listening",
    localElapsed: "Elapsed",
    localPhaseStopped: "Stopped",
    localRemoteNoStart: "Start and stop this URL on the remote PC.",
    localHint: "Load on Windows only when you need it. Save absolute paths to the UNSEEN Gemma 4 Q4_K_M GGUF and llama-server.exe, then Start. Do not keep the weights on the always-on PC.",
    localUrl: "Local API URL",
    localFile: "GGUF file",
    localContext: "Context length",
    localGpu: "GPU layers",
    localAuto: "Start with DSH",
    localSaveHint: "Save before starting. Stop the model before changing launch settings.",
    localPrompt: "Processed prompt tokens",
    localGenerated: "Generated tokens",
    localLog: "Runtime log",
    restartTitle: "Restart DSH",
    restartDesc: "Quit and relaunch this process. Finish running tasks first.",
    restartNow: "Restart",
    restarting: "Sending restart\u2026",
    restartReconnect: "Restarting. Waiting to reconnect\u2026",
    restartTimeout: "Reconnect timed out. Refresh the page.",
    restartFailed: "Could not start a restart.",
    localKey: "Inference API key (optional)",
    remoteHint: "For Tailscale use HTTPS *.ts.net/v1 or http://100.x.x.x:port/v1. Manage the server on the remote PC."
  }
};

// src/upstream-client.mjs
var SOURCES = Object.freeze({ grok: "dsh-grok-provider", codex: "dsh-codex-connect" });
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var percent = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
var shortString = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;
var amount = (value) => typeof value === "string" && value.length <= 64 && /^-?\d+(?:\.\d+)?$/u.test(value);
var iso = (value) => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
var UpstreamError = class extends Error {
  constructor(message2, unavailable = false) {
    super(message2);
    this.unavailable = unavailable;
  }
};
function invalid() {
  throw new UpstreamError("Provider returned an invalid response.");
}
function emptyUsage(provider, status = "unknown", message2) {
  return {
    status,
    source: SOURCES[provider],
    updatedAt: null,
    windows: [],
    credits: null,
    ...message2 ? { message: message2 } : {}
  };
}
function grokSession(session) {
  if (session === void 0) return void 0;
  if (!record(session) || !shortString(session.sessionId) || !["running", "succeeded", "cancelled", "failed"].includes(session.state)) invalid();
  return {
    status: session.state,
    sessionId: session.sessionId,
    ...session.state === "running" ? { message: "Complete login in the browser opened by the official Grok CLI on the DSH host." } : {},
    ...session.state === "failed" ? { message: "The official Grok CLI login did not complete." } : {}
  };
}
function grokStatus(value) {
  if (!record(value) || typeof value.available !== "boolean" || typeof value.driver !== "boolean") invalid();
  const login = grokSession(value.session);
  return {
    auth: value.available ? "authenticated" : value.driver ? "unauthenticated" : "unavailable",
    usage: emptyUsage("grok", "unavailable", value.available ? "Quota has not been retrieved." : "Sign in to read Grok usage."),
    ...login ? { login } : {}
  };
}
function grokUsage(value) {
  if (!record(value) || !record(value.quota) || !["ready", "unavailable"].includes(value.quota.state)) invalid();
  const updatedAt = iso(value.fetchedAt);
  if (updatedAt === null) invalid();
  const quota = value.quota;
  if (quota.state === "unavailable") return { ...emptyUsage("grok", "unavailable", "Grok quota is unavailable."), updatedAt };
  if (quota.usedPercent === void 0 && quota.remainingPercent === void 0) {
    return { ...emptyUsage("grok", "unknown", "Grok did not disclose a remaining quota or credit balance."), updatedAt };
  }
  if (!percent(quota.usedPercent) || !percent(quota.remainingPercent)) invalid();
  const resetsAt = quota.resetsAt === void 0 ? null : iso(quota.resetsAt);
  if (quota.resetsAt !== void 0 && resetsAt === null) invalid();
  const period = ["weekly", "monthly"].includes(quota.periodKind) ? quota.periodKind : "billing";
  return {
    status: "available",
    source: SOURCES.grok,
    updatedAt,
    windows: [{
      id: `grok:${period}`,
      label: `Grok ${period}`,
      usedPercent: quota.usedPercent,
      remainingPercent: quota.remainingPercent,
      resetsAt
    }],
    credits: null
  };
}
function windowLabel(seconds) {
  if (seconds % 604800 === 0) return `${seconds / 604800} week`;
  if (seconds % 86400 === 0) return `${seconds / 86400} day`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour`;
  if (seconds % 60 === 0) return `${seconds / 60} minute`;
  return `${seconds} second`;
}
function codexUsage(value, quotaError) {
  if (!record(value) || !Array.isArray(value.rateLimits) || value.rateLimits.length > 100) invalid();
  const windows = value.rateLimits.flatMap((bucket) => {
    if (!record(bucket) || !shortString(bucket.id) || !Array.isArray(bucket.windows) || bucket.windows.length > 100 || bucket.name !== void 0 && !shortString(bucket.name)) invalid();
    return bucket.windows.map((window2, index) => {
      if (!record(window2) || !percent(window2.remainingPercent) || !Number.isSafeInteger(window2.windowSeconds) || window2.windowSeconds <= 0) invalid();
      let resetsAt = null;
      if (window2.resetAt !== void 0) {
        if (!Number.isSafeInteger(window2.resetAt) || window2.resetAt <= 0 || !Number.isFinite(new Date(window2.resetAt * 1e3).getTime())) invalid();
        resetsAt = new Date(window2.resetAt * 1e3).toISOString();
      }
      return {
        id: `${bucket.id}:${window2.windowSeconds}:${index}`,
        label: `${bucket.name ?? bucket.id} \xB7 ${windowLabel(window2.windowSeconds)}`,
        windowSeconds: window2.windowSeconds,
        usedPercent: 100 - window2.remainingPercent,
        remainingPercent: window2.remainingPercent,
        resetsAt
      };
    });
  });
  let credits = null;
  if (value.credits !== void 0) {
    if (!record(value.credits) || typeof value.credits.unlimited !== "boolean" || value.credits.balance !== void 0 && !amount(value.credits.balance)) invalid();
    credits = { unlimited: value.credits.unlimited, balance: value.credits.balance ?? null, unit: null };
  }
  let individualLimit;
  if (value.individualLimit !== void 0) {
    const limit = value.individualLimit;
    if (!record(limit) || !amount(limit.limit) || !amount(limit.used) || !amount(limit.remaining) || !percent(limit.remainingPercent)) invalid();
    individualLimit = {
      limit: limit.limit,
      used: limit.used,
      remaining: limit.remaining,
      remainingPercent: limit.remainingPercent
    };
  }
  const hasData = windows.length > 0 || credits !== null || individualLimit !== void 0;
  return {
    status: quotaError ? "error" : hasData ? "available" : "unknown",
    source: SOURCES.codex,
    updatedAt: null,
    windows,
    credits,
    ...individualLimit ? { individualLimit } : {},
    ...quotaError ? { message: "Codex is signed in, but usage could not be retrieved." } : hasData ? {} : { message: "Codex did not disclose a remaining quota or credit balance." }
  };
}
function codexStatus(value) {
  const state = codexState(value);
  if (shortString(value.authenticationSource)) state.authenticationSource = value.authenticationSource;
  if (value.accounts !== void 0) {
    if (!Array.isArray(value.accounts) || value.accounts.length > 16) invalid();
    state.accounts = value.accounts.map((account) => {
      if (!record(account) || !/^acct_[A-Za-z0-9_-]{43}$/.test(account.accountKey) || !shortString(account.displayName) || typeof account.active !== "boolean") invalid();
      let usage;
      try {
        usage = codexUsage(account.usage, account.quotaError);
      } catch {
        usage = emptyUsage("codex", "error", "Codex is signed in, but usage could not be retrieved.");
      }
      if (iso(account.fetchedAt)) usage.updatedAt = iso(account.fetchedAt);
      return {
        accountKey: account.accountKey,
        displayName: account.displayName,
        ...shortString(account.maskedEmail) ? { maskedEmail: account.maskedEmail } : {},
        active: account.active,
        usage
      };
    });
    if (new Set(state.accounts.map((a) => a.accountKey)).size !== state.accounts.length) invalid();
    if (state.accounts.length && value.status === "signing-in") state.auth = "authenticated";
  }
  if (iso(value.fetchedAt)) state.usage.updatedAt = iso(value.fetchedAt);
  return state;
}
function codexState(value) {
  if (!record(value)) invalid();
  if (value.status === "signed-in") {
    if (value.quotaError !== void 0 && typeof value.quotaError !== "string") invalid();
    let usage;
    try {
      usage = codexUsage(value.usage, value.quotaError);
    } catch {
      usage = emptyUsage("codex", "error", "Codex is signed in, but returned invalid usage data.");
    }
    return { auth: "authenticated", usage };
  }
  if (value.status === "signed-out" || value.status === "reauth-required") {
    return { auth: "unauthenticated", usage: emptyUsage(
      "codex",
      "unavailable",
      value.status === "reauth-required" ? "Codex authorization must be renewed." : "Sign in to read Codex usage."
    ) };
  }
  if (value.status === "signing-in") {
    return { auth: "unknown", usage: emptyUsage("codex"), login: { status: "running", message: "Complete Codex authorization in the browser." } };
  }
  if (value.status === "error") {
    return { auth: "unknown", usage: emptyUsage("codex", "error", "The Codex provider could not read account status.") };
  }
  invalid();
}
function createUpstreamClient(provider, { fetch: fetchImpl = globalThis.fetch } = {}) {
  if (!Object.hasOwn(SOURCES, provider)) throw new TypeError("Unsupported upstream provider.");
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");
  let sequence = 0;
  let last = { auth: "unknown", usage: emptyUsage(provider) };
  let activeSession;
  let mutation;
  async function request2(endpoint3, method = "POST", payload = {}, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 35e3);
    const rpcId = `darask-${++sequence}`;
    const path = provider === "grok" ? `/api/grok-auth/${endpoint3}` : `/api/darask/codex/${endpoint3}`;
    try {
      if (controller.signal.aborted) throw new UpstreamError("Provider request was cancelled; check status before retrying.");
      const response = await fetchImpl(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { accept: "application/json", ...method !== "GET" ? { "content-type": "application/json" } : {} },
        ...method !== "GET" ? { body: JSON.stringify(provider === "grok" ? { type: "client-request", rpcId, method: `grok-auth/${endpoint3}`, payload } : payload) } : {},
        signal: controller.signal
      });
      if (!response.ok) {
        if (response.status === 404) throw new UpstreamError("The bundled provider endpoint is unavailable.", true);
        if (response.status === 401 || response.status === 403) throw new UpstreamError("The DSH session or browser origin is not authorized for this provider.");
        throw new UpstreamError(`Provider request failed (HTTP ${Number.isInteger(response.status) ? response.status : "error"}).`);
      }
      const value = await response.json();
      if (provider === "codex") return value;
      if (!record(value) || value.type !== "server-response" || value.rpcId !== rpcId || !record(value.result)) invalid();
      if (value.result.ok !== true) throw new UpstreamError("The Grok provider operation failed.");
      if (!record(value.result.value)) invalid();
      return value.result.value;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      throw new UpstreamError(signal?.aborted ? "Provider request was cancelled; check status before retrying." : controller.signal.aborted ? "Provider request timed out; check status before retrying." : "Provider request could not be completed.");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  function remember(status2) {
    activeSession = status2.login?.status === "running" ? status2.login.sessionId : void 0;
    last = status2;
    return status2;
  }
  function failure(error, action = false) {
    const message2 = error instanceof UpstreamError ? error.message : "Provider returned an invalid response.";
    const auth = error?.unavailable ? "unavailable" : action ? last.auth : "unknown";
    return {
      ...provider === "codex" && action ? { accounts: last.accounts } : {},
      auth,
      usage: emptyUsage(provider, error?.unavailable ? "unavailable" : "error", message2),
      message: message2,
      ...action ? { login: { status: "failed", message: message2 } } : {}
    };
  }
  async function status({ signal } = {}) {
    try {
      const value = await request2("status", provider === "codex" ? "GET" : "POST", {}, signal);
      if (provider === "codex") return remember(codexStatus(value));
      if (value.kind !== "status") invalid();
      const current = grokStatus(value.status);
      if (current.auth === "authenticated") {
        try {
          const result = await request2("dashboard", "POST", {}, signal);
          if (result.kind !== "dashboard") invalid();
          current.usage = grokUsage(result.dashboard);
        } catch (error) {
          current.usage = failure(error).usage;
        }
      }
      return remember(current);
    } catch (error) {
      return remember(failure(error));
    }
  }
  function mutate(operation) {
    if (mutation) return mutation;
    mutation = operation().catch((error) => failure(error, true)).finally(() => {
      mutation = void 0;
    });
    return mutation;
  }
  function login({ signal } = {}) {
    return mutate(async () => {
      const result = await request2("login", "POST", {}, signal);
      if (provider === "codex") {
        if (!record(result) || typeof result.url !== "string" || result.url.length > 16384) invalid();
        let url;
        try {
          url = new URL(result.url);
        } catch {
          invalid();
        }
        if (url.protocol !== "https:" || url.username !== "" || url.password !== "") invalid();
        return remember({ ...last, login: {
          status: "running",
          url: url.href,
          message: "Open the authorization URL, then complete Codex sign-in."
        } });
      }
      if (result.kind === "busy" || result.kind === "unavailable") {
        return remember({ ...grokStatus(result.status), login: {
          status: result.kind,
          message: result.kind === "busy" ? "A Grok authentication operation is already running." : "The official Grok CLI authentication driver is unavailable."
        } });
      }
      if (result.kind !== "login-started" || result.status?.state !== "running") invalid();
      const session = grokSession(result.status);
      return remember({ auth: last.auth, usage: emptyUsage(provider), login: session });
    });
  }
  function logout({ signal } = {}) {
    return mutate(async () => {
      const result = await request2("logout", "POST", {}, signal);
      if (provider === "codex") {
        if (!record(result) || result.ok !== true) invalid();
        return remember(codexStatus({ status: "signed-out" }));
      }
      if (result.kind === "logout-confirmation-required") {
        if (!shortString(result.confirmationId) || iso(result.expiresAt) === null) invalid();
        return { ...last, logoutConfirmation: {
          required: true,
          expiresAt: iso(result.expiresAt),
          message: "Grok logout also signs out the official Grok CLI. Click Sign out again within 30 seconds to confirm."
        } };
      }
      if (!["logout-succeeded", "logout-cancelled", "logout-failed", "logout-cleanup-failed", "busy", "unavailable"].includes(result.kind)) invalid();
      const current = grokStatus(result.status);
      if (result.kind !== "logout-succeeded") current.message = "Grok logout did not complete; check the account status.";
      return remember(current);
    });
  }
  function cancelLogin({ signal } = {}) {
    return mutate(async () => {
      if (provider === "grok") {
        if (!activeSession) {
          return { ...last, login: { status: "unavailable", message: "No observed Grok login is running. Refresh status before cancelling." } };
        }
        const result = await request2("cancel", "POST", { sessionId: activeSession }, signal);
        if (!["cancelled", "not-running"].includes(result.kind)) invalid();
        return remember(grokStatus(result.status));
      }
      return remember({ ...last, login: void 0, ...codexStatus(await request2("cancel", "POST", {}, signal)) });
    });
  }
  function accountMutation(endpoint3, method, payload, signal) {
    if (provider !== "codex") return Promise.reject(new TypeError("Codex accounts only."));
    return mutate(async () => {
      await request2(endpoint3, method, payload, signal);
      return status({ signal });
    });
  }
  const selectAccount = ({ accountKey, signal } = {}) => accountMutation("accounts", "POST", { accountKey }, signal);
  const removeAccount = ({ accountKey, signal } = {}) => accountMutation("accounts", "DELETE", { accountKey }, signal);
  const submitCallback = ({ callbackUrl, signal } = {}) => accountMutation("callback", "POST", { callbackUrl }, signal);
  return Object.freeze({ status, login, logout, cancelLogin, selectAccount, removeAccount, submitCallback });
}

// src/settings/status-resource.mjs
function createStatusResource() {
  let snapshot = { data: null, loading: true, error: null, pending: null };
  const listeners = /* @__PURE__ */ new Set();
  const requests = /* @__PURE__ */ new Set();
  let timer;
  let stopped = false;
  let reading;
  let generation = 0;
  const lifetime = new AbortController();
  const upstream = Object.fromEntries(["grok", "codex"].map((id) => [id, createUpstreamClient(id)]));
  const overlays = /* @__PURE__ */ new Map();
  const publish = (patch) => {
    if (stopped) return;
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };
  const request2 = async (path, options = {}) => {
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 3e4;
    const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    requests.add(controller);
    try {
      const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...fetchOptions, signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) throw new Error(typeof body?.error === "string" ? body.error : `HTTP ${response.status}`);
      if (!body || typeof body !== "object") throw new Error("Invalid status response");
      return body;
    } finally {
      clearTimeout(timeout);
      requests.delete(controller);
    }
  };
  const overlayStatus = (id, value) => {
    const previous = overlays.get(id);
    const pendingUrl = value.login?.status === "running" ? previous?.login?.url : void 0;
    const confirmation = previous?.logoutConfirmation;
    const validConfirmation = confirmation?.required && Date.parse(confirmation.expiresAt) > Date.now() && value.auth === "authenticated";
    const merged = {
      ...value,
      ...pendingUrl && !value.login?.url ? { login: { ...value.login, url: pendingUrl } } : {},
      ...validConfirmation && !value.logoutConfirmation ? { logoutConfirmation: confirmation } : {}
    };
    overlays.set(id, merged);
    return merged;
  };
  const mergedStatus = (data) => ({ ...data, providers: (data.providers ?? []).map((provider) => ({ ...provider, ...overlays.get(provider.id) })) });
  const readUpstream = async (ids, ownGeneration = generation) => {
    await Promise.all(ids.map(async (id) => {
      const value = await upstream[id].status({ signal: lifetime.signal });
      if (ownGeneration === generation) overlayStatus(id, value);
    }));
  };
  const load = () => {
    if (stopped || reading) return reading ?? Promise.resolve();
    const ownGeneration = generation;
    reading = request2("/api/darask/status").then(async (data) => {
      await readUpstream(Object.keys(upstream).filter((id) => data.providers?.some((provider) => provider.id === id)), ownGeneration);
      if (ownGeneration === generation) publish({ data: mergedStatus(data), loading: false, error: null });
    }).catch((error) => {
      if (ownGeneration === generation) publish({ loading: false, error: error.message });
    }).finally(() => {
      reading = void 0;
    });
    return reading;
  };
  const poll = () => {
    clearTimeout(timer);
    if (stopped || listeners.size === 0) return;
    const signingIn = snapshot.data?.providers?.some((provider) => ["pending", "waiting", "authorizing", "running"].includes(provider.login?.status));
    const loadingLocal = snapshot.data?.providers?.some((provider) => provider.id === "local" && ["starting", "stopping"].includes(provider.localRuntime?.phase));
    timer = setTimeout(async () => {
      if (!snapshot.pending) await load();
      poll();
    }, signingIn || loadingLocal ? 2e3 : 15e3);
  };
  const action = async (payload) => {
    if (stopped || snapshot.pending) throw new Error("Another action is in progress");
    generation += 1;
    publish({ pending: `${payload.action}:${payload.provider ?? ""}`, error: null });
    try {
      if (upstream[payload.provider] && ["login", "logout", "cancelLogin", "selectAccount", "removeAccount", "submitCallback"].includes(payload.action)) {
        const result2 = await upstream[payload.provider][payload.action]({ ...payload, signal: lifetime.signal });
        if (payload.action === "logout") overlays.delete(payload.provider);
        overlayStatus(payload.provider, result2);
        if (snapshot.data) publish({ data: mergedStatus(snapshot.data) });
        return result2;
      }
      const result = await request2("/api/darask/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeoutMs: payload.action === "testLocal" ? 9e4 : 3e4
      });
      if (Array.isArray(result.providers)) {
        await readUpstream(Object.keys(upstream).filter((id) => !payload.provider || payload.provider === id));
        publish({ data: mergedStatus(result), loading: false });
      } else {
        if (reading) await reading;
        await load();
      }
      return result;
    } catch (error) {
      publish({ error: error.message });
      throw error;
    } finally {
      publish({ pending: null });
      poll();
    }
  };
  return {
    source: {
      getSnapshot: () => snapshot,
      subscribe(listener) {
        listeners.add(listener);
        if (listeners.size === 1) {
          void load();
          poll();
        }
        return () => {
          listeners.delete(listener);
          if (listeners.size === 0) clearTimeout(timer);
        };
      }
    },
    load,
    action,
    dispose() {
      stopped = true;
      lifetime.abort();
      clearTimeout(timer);
      for (const controller of requests) controller.abort();
      listeners.clear();
    }
  };
}

// src/settings/client-effects.mjs
function completeOpenRouterRedirect(win = globalThis.window, fetchImpl = globalThis.fetch) {
  if (!win?.location?.href || typeof fetchImpl !== "function") return void 0;
  const url = new URL(win.location.href);
  const keys = [...url.searchParams.keys()];
  if (url.pathname !== "/" || url.searchParams.get("darask_openrouter_callback") !== "1" || new Set(keys).size !== keys.length || keys.some((key) => !["darask_openrouter_callback", "state", "code"].includes(key)) || !url.searchParams.get("state") || !url.searchParams.get("code")) return void 0;
  const callbackUrl = url.href;
  win.history?.replaceState?.(win.history.state, "", `${url.origin}/`);
  return fetchImpl("/api/darask/action", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "submitCallback", provider: "openrouter", config: { callbackUrl } })
  }).then((response) => {
    if (!response.ok) throw new Error("OpenRouter callback failed");
  });
}
function codexAuthorizationUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 16384) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
}
async function openCodexAuthorization(action, win = globalThis.window) {
  if (typeof action !== "function") throw new TypeError("Codex login action is required");
  let popup = null;
  try {
    popup = win?.open?.("about:blank", "_blank") ?? null;
    if (popup) popup.opener = null;
  } catch {
    popup = null;
  }
  try {
    const result = await action();
    const url = codexAuthorizationUrl(result?.login?.url);
    if (!url) {
      try {
        popup?.close?.();
      } catch {
      }
      return { result, url: null, opened: false };
    }
    if (!popup) return { result, url, opened: false };
    try {
      if (typeof popup.location?.replace === "function") popup.location.replace(url);
      else popup.location.href = url;
      return { result, url, opened: true };
    } catch {
      try {
        popup.close?.();
      } catch {
      }
      return { result, url, opened: false };
    }
  } catch (error) {
    try {
      popup?.close?.();
    } catch {
    }
    throw error;
  }
}
function autoPermissionIcon(doc) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = doc.createElementNS(ns, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const shield = doc.createElementNS(ns, "path");
  shield.setAttribute("d", "M8.20554 0.9L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.9Z");
  shield.setAttribute("stroke", "currentColor");
  shield.setAttribute("stroke-width", "1.31831");
  shield.setAttribute("stroke-linejoin", "round");
  const bolt = doc.createElementNS(ns, "path");
  bolt.setAttribute("d", "M8.9 4.35 6.35 8.15h1.55L7.1 11.65 9.7 7.7H8.1L8.9 4.35Z");
  bolt.setAttribute("fill", "currentColor");
  svg.append(shield, bolt);
  const wrap = doc.createElement("span");
  wrap.className = "darask-auto-permission-icon";
  wrap.setAttribute("aria-hidden", "true");
  wrap.append(svg);
  return wrap;
}
function decorateAutoPermissionIcons(root) {
  if (!root || typeof root.querySelectorAll !== "function") return void 0;
  const doc = root.ownerDocument ?? root;
  const paint = () => {
    for (const item of root.querySelectorAll('[role="menuitem"]')) {
      if (item.querySelector(".darask-auto-permission-icon")) continue;
      const label2 = [...item.children].find((node) => node.tagName === "SPAN" && !node.querySelector("svg"))?.textContent?.trim();
      if (label2 !== "\u81EA\u52D5") continue;
      item.insertBefore(autoPermissionIcon(doc), item.firstChild);
    }
    for (const trigger of root.querySelectorAll('button[aria-label*="\u81EA\u52D5"]')) {
      if (trigger.querySelector('.darask-auto-permission-icon, span[class*="triggerIcon"]')) continue;
      trigger.insertBefore(autoPermissionIcon(doc), trigger.firstChild);
    }
  };
  paint();
  if (typeof MutationObserver !== "function") return void 0;
  const observer = new MutationObserver(paint);
  try {
    observer.observe(root.documentElement ?? root, { childList: true, subtree: true });
  } catch {
    return void 0;
  }
  return () => observer.disconnect();
}

// src/settings/accounts.jsx
var import_react12 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives11 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/model-catalogs.mjs
var MODEL_CATALOGS = Object.freeze({
  deepseek: Object.freeze([
    Object.freeze({ id: "deepseek-v4-pro", name: "DeepSeek API \xB7 DeepSeek V4 Pro" })
  ]),
  openai: Object.freeze([
    Object.freeze({ id: "gpt-5.6-sol", name: "OpenAI API \xB7 Sol" }),
    Object.freeze({ id: "gpt-5.6-luna", name: "OpenAI API \xB7 Luna" })
  ]),
  openrouter: Object.freeze([
    Object.freeze({ id: "openai/gpt-5.6-sol", name: "OpenRouter \xB7 OpenAI Sol" }),
    Object.freeze({ id: "anthropic/claude-opus-5", name: "OpenRouter \xB7 Claude Opus 5" }),
    Object.freeze({ id: "anthropic/claude-sonnet-5", name: "OpenRouter \xB7 Claude Sonnet 5" }),
    Object.freeze({ id: "x-ai/grok-4.6", name: "OpenRouter \xB7 Grok 4.6" })
  ]),
  codex: Object.freeze([
    Object.freeze({ id: "gpt-6-astra", name: "Codex \xB7 Astra" }),
    Object.freeze({ id: "gpt-5.6-sol", name: "Codex \xB7 Sol" }),
    Object.freeze({ id: "gpt-5.6-terra", name: "Codex \xB7 Terra" }),
    Object.freeze({ id: "gpt-5.6-luna", name: "Codex \xB7 Luna" })
  ]),
  grok: Object.freeze([
    Object.freeze({ id: "grok-4.6", name: "Grok 4.6" })
  ]),
  claude: Object.freeze([
    Object.freeze({ id: "claude-fable-5-1", name: "Claude Fable 5.1" }),
    Object.freeze({ id: "claude-opus-5", name: "Claude Opus 5" }),
    Object.freeze({ id: "claude-sonnet-5", name: "Claude Sonnet 5" })
  ])
});
function defaultModelVisibility() {
  return Object.fromEntries(Object.entries(MODEL_CATALOGS).map(([provider, models]) => [provider, models.map((model) => model.id)]));
}

// src/locales/messages-ja.mjs
var messages = {
  "Complete login in the browser opened by the official Grok CLI on the DSH host.": "\u672C\u6A5F\u306E\u516C\u5F0F Grok CLI \u304C\u958B\u3044\u305F\u30D6\u30E9\u30A6\u30B6\u3067\u30ED\u30B0\u30A4\u30F3\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "The official Grok CLI login did not complete.": "\u516C\u5F0F Grok CLI \u306E\u30ED\u30B0\u30A4\u30F3\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "Complete Codex authorization in the browser.": "\u30D6\u30E9\u30A6\u30B6\u3067 Codex \u306E\u8A8D\u8A3C\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Open the authorization URL, then complete Codex sign-in.": "\u8A8D\u8A3C\u30DA\u30FC\u30B8\u3092\u958B\u3044\u3066 Codex \u306E\u30ED\u30B0\u30A4\u30F3\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Complete sign-in in the provider browser flow.": "\u30B5\u30FC\u30D3\u30B9\u306E\u30D6\u30E9\u30A6\u30B6\u8A8D\u8A3C\u3067\u30ED\u30B0\u30A4\u30F3\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Login cancelled.": "\u30ED\u30B0\u30A4\u30F3\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F\u3002",
  "Login did not complete. Start sign-in again.": "\u30ED\u30B0\u30A4\u30F3\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "A Grok authentication operation is already running.": "Grok \u306E\u8A8D\u8A3C\u51E6\u7406\u304C\u5B9F\u884C\u4E2D\u3067\u3059\u3002",
  "The official Grok CLI authentication driver is unavailable.": "\u516C\u5F0F Grok CLI \u306E\u8A8D\u8A3C\u6A5F\u80FD\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
  "No observed Grok login is running. Refresh status before cancelling.": "\u5B9F\u884C\u4E2D\u306E Grok \u30ED\u30B0\u30A4\u30F3\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u72B6\u614B\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Grok logout also signs out the official Grok CLI. Click Sign out again within 30 seconds to confirm.": "\u516C\u5F0F Grok CLI \u304B\u3089\u3082\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3059\u3002\u7D9A\u3051\u308B\u5834\u5408\u306F 30 \u79D2\u4EE5\u5185\u306B\u3082\u3046\u4E00\u5EA6\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Quota has not been retrieved.": "\u5229\u7528\u67A0\u3092\u307E\u3060\u53D6\u5F97\u3057\u3066\u3044\u307E\u305B\u3093\u3002",
  "Sign in to read Grok usage.": "Grok \u306E\u4F7F\u7528\u72B6\u6CC1\u3092\u78BA\u8A8D\u3059\u308B\u306B\u306F\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Grok quota is unavailable.": "Grok \u306E\u5229\u7528\u67A0\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  "Grok did not disclose a remaining quota or credit balance.": "Grok \u304B\u3089\u6B8B\u308A\u306E\u5229\u7528\u67A0\u3084\u30AF\u30EC\u30B8\u30C3\u30C8\u304C\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002",
  "Codex is signed in, but usage could not be retrieved.": "Codex \u306F\u30ED\u30B0\u30A4\u30F3\u6E08\u307F\u3067\u3059\u304C\u3001\u4F7F\u7528\u72B6\u6CC1\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "Codex did not disclose a remaining quota or credit balance.": "Codex \u304B\u3089\u6B8B\u308A\u306E\u5229\u7528\u67A0\u3084\u30AF\u30EC\u30B8\u30C3\u30C8\u304C\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002",
  "Codex is signed in, but returned invalid usage data.": "Codex \u306F\u30ED\u30B0\u30A4\u30F3\u6E08\u307F\u3067\u3059\u304C\u3001\u4F7F\u7528\u72B6\u6CC1\u306E\u5FDC\u7B54\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "Codex authorization must be renewed.": "Codex \u306E\u518D\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002",
  "Sign in to read Codex usage.": "Codex \u306E\u4F7F\u7528\u72B6\u6CC1\u3092\u78BA\u8A8D\u3059\u308B\u306B\u306F\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "The Codex provider could not read account status.": "Codex \u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u72B6\u614B\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "The bundled provider endpoint is unavailable.": "\u7D71\u5408\u5143\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u63A5\u7D9A\u5148\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
  "The DSH session or browser origin is not authorized for this provider.": "DSH \u306E\u30ED\u30B0\u30A4\u30F3\u72B6\u614B\u307E\u305F\u306F\u30D6\u30E9\u30A6\u30B6\u306E\u63A5\u7D9A\u5143\u304C\u3001\u3053\u306E\u30B5\u30FC\u30D3\u30B9\u3067\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002",
  "Provider returned an invalid response.": "\u30B5\u30FC\u30D3\u30B9\u306E\u5FDC\u7B54\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "The Grok provider operation failed.": "Grok \u306E\u64CD\u4F5C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
  "Provider request was cancelled; check status before retrying.": "\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F\u3002\u518D\u8A66\u884C\u524D\u306B\u72B6\u614B\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Provider request timed out; check status before retrying.": "\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u518D\u8A66\u884C\u524D\u306B\u72B6\u614B\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Provider request could not be completed.": "\u30B5\u30FC\u30D3\u30B9\u3078\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "Account credits require a separate management key; API key limits are shown when available.": "\u30A2\u30AB\u30A6\u30F3\u30C8\u6B8B\u9AD8\u306E\u53D6\u5F97\u306B\u306F\u5225\u9014\u7BA1\u7406\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u53D6\u5F97\u3067\u304D\u308B\u5834\u5408\u306F API \u30AD\u30FC\u306E\u4E0A\u9650\u6B8B\u984D\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
  "Management-key credits request failed; API-key usage remains available.": "\u7BA1\u7406\u30AD\u30FC\u3067\u6B8B\u9AD8\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002API \u30AD\u30FC\u306E\u4F7F\u7528\u72B6\u6CC1\u306F\u8868\u793A\u3067\u304D\u307E\u3059\u3002",
  "Organization usage requires an admin key. Complimentary remaining is unknown until that key can be read.": "\u7121\u6599\u30C8\u30FC\u30AF\u30F3\u306E\u4F7F\u7528\u91CF\u306B\u306F\u7BA1\u7406\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u6B8B\u91CF\u306F\u53D6\u5F97\u3067\u304D\u308B\u307E\u3067\u672A\u78BA\u8A8D\u306E\u307E\u307E\u3067\u3059\u3002",
  "Admin-key usage request failed; the project API key remains usable.": "\u7BA1\u7406\u30AD\u30FC\u3067\u4F7F\u7528\u91CF\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E API \u30AD\u30FC\u306F\u4F7F\u3048\u307E\u3059\u3002",
  "Complimentary remaining percent needs a usage tier; used tokens are shown when the admin key can read organization usage.": "\u6B8B\u91CF\u306E\u30D1\u30FC\u30BB\u30F3\u30C8\u8868\u793A\u306B\u306F usage tier \u306E\u6307\u5B9A\u304C\u5FC5\u8981\u3067\u3059\u3002\u7BA1\u7406\u30AD\u30FC\u304C\u8AAD\u3081\u308B\u5834\u5408\u306F\u4F7F\u7528\u30C8\u30FC\u30AF\u30F3\u3060\u3051\u3092\u793A\u3057\u307E\u3059\u3002",
  "OpenAI request failed; check the connection and retry.": "OpenAI \u3078\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Claude Code has not supplied subscription limits.": "Claude Code \u304B\u3089\u5951\u7D04\u306E\u5229\u7528\u67A0\u304C\u307E\u3060\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002",
  "Claude statusLine snapshot is invalid or unreadable.": "Claude \u306E\u30B9\u30C6\u30FC\u30BF\u30B9\u8868\u793A\u9023\u643A\u30D5\u30A1\u30A4\u30EB\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3002",
  "The action failed. Check the connection or executable path.": "\u64CD\u4F5C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u63A5\u7D9A\u72B6\u614B\u307E\u305F\u306F CLI \u306E\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "DARASK status is unavailable.": "DARASK \u306E\u72B6\u614B\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002",
  "Tailscale: connect this device first.": "\u5148\u306B Tailscale \u30A2\u30D7\u30EA\u3067\u3053\u306E\u7AEF\u672B\u3092\u63A5\u7D9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Tailscale: this HTTPS port belongs to another configuration.": "\u3053\u306E HTTPS \u30DD\u30FC\u30C8\u306B\u306F\u5225\u306E Tailscale \u8A2D\u5B9A\u304C\u3042\u308A\u307E\u3059\u3002",
  "Tailscale: this Serve configuration was not created by DARASK.": "\u3053\u306E\u5171\u6709\u8A2D\u5B9A\u306F DARASK \u304C\u4F5C\u6210\u3057\u305F\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002Tailscale \u5074\u3067\u7BA1\u7406\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Tailscale: Serve failed. Check HTTPS enablement and permissions in the Tailscale app.": "Tailscale \u306E\u5171\u6709\u3092\u958B\u59CB\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002HTTPS \u306E\u6709\u52B9\u5316\u3068\u6A29\u9650\u3092 Tailscale \u5074\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Tailscale: Serve state could not be verified.": "Tailscale \u306E\u5171\u6709\u72B6\u614B\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "Browser Run: account ID must have 32 hexadecimal characters.": "Cloudflare \u306E\u30A2\u30AB\u30A6\u30F3\u30C8 ID \u306F 32 \u6841\u306E\u82F1\u6570\u5B57\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Browser Run: invalid API token.": "Browser Run \u306E API \u30C8\u30FC\u30AF\u30F3\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Browser Run: request failed. Check the API token and connection.": "Browser Run \u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002API \u30C8\u30FC\u30AF\u30F3\u3068\u63A5\u7D9A\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Computer: enable PC screen control in Settings \u2192 Accounts \u2192 PCs & Tailscale.": "\u8A2D\u5B9A \u2192 \u30A2\u30AB\u30A6\u30F3\u30C8 \u2192 PC\u30FBTailscale \u3067\u753B\u9762\u64CD\u4F5C\u3092\u6709\u52B9\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Computer: PC screen control is available on Windows.": "PC \u753B\u9762\u306E\u64CD\u4F5C\u306F Windows \u3067\u5229\u7528\u3067\u304D\u307E\u3059\u3002",
  "Computer: integration unavailable.": "PC \u753B\u9762\u306E\u64CD\u4F5C\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
  "Computer: take a screenshot before using screenshot coordinates.": "\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u524D\u306B\u753B\u9762\u306E\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u3092\u53D6\u5F97\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "Computer: desktop host timed out.": "PC \u753B\u9762\u306E\u64CD\u4F5C\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002",
  "Computer: cancelled.": "PC \u753B\u9762\u306E\u64CD\u4F5C\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F\u3002"
};
function messageJa(value, fallback = "\u51E6\u7406\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u63A5\u7D9A\u72B6\u614B\u3068\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002") {
  if (!value) return fallback;
  if (messages[value]) return messages[value];
  if (/[ぁ-んァ-ヶ]/u.test(value)) return value;
  if (/Cursor.*(?:quota|usage)|individual.*(?:quota|balance)/i.test(value)) return "Cursor \u306E\u500B\u4EBA\u30A2\u30AB\u30A6\u30F3\u30C8\u7528\u306E\u4F7F\u7528\u91CF\u30FB\u6B8B\u9AD8\u53D6\u5F97 API \u306F\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002";
  if (/Claude.*statusLine/i.test(value)) return "Claude Code \u306E\u30B9\u30C6\u30FC\u30BF\u30B9\u8868\u793A\u9023\u643A\u3092\u8A2D\u5B9A\u3059\u308B\u3068\u3001\u53D6\u5F97\u3067\u304D\u308B\u5229\u7528\u67A0\u3092\u8868\u793A\u3057\u307E\u3059\u3002";
  if (/^Priority/.test(value)) return "\u512A\u5148\u9806\u4F4D\u306B\u306F\u5168\u30B5\u30FC\u30D3\u30B9\u3092\u4E00\u5EA6\u305A\u3064\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (/absolute.*path/.test(value)) return "\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB\u306F\u7D76\u5BFE\u30D1\u30B9\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (/Cursor cannot|Grok cannot|Cursor and Grok/.test(value)) return "Cursor \u3068 Grok \u306B\u306F\u3001\u305D\u308C\u305E\u308C\u5225\u306E\u6B63\u3057\u3044\u5B9F\u884C\u30D5\u30A1\u30A4\u30EB\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (/^Computer:/.test(value)) return "PC \u753B\u9762\u306E\u64CD\u4F5C\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u8A2D\u5B9A\u3068\u5BFE\u8C61\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (/^Invalid|^Unknown/.test(value)) return "\u8A2D\u5B9A\u5024\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  const status = /(?:HTTP\s+|failed \()(\d{3})/.exec(value)?.[1];
  if (status) return `\u63A5\u7D9A\u5148\u3078\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF08HTTP ${status}\uFF09\u3002`;
  return fallback;
}
function labelJa(value) {
  const exact = { "API key limit": "API \u30AD\u30FC\u306E\u5229\u7528\u4E0A\u9650", "Account credits": "\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u30AF\u30EC\u30B8\u30C3\u30C8", "API key remaining limit": "API \u30AD\u30FC\u306E\u4E0A\u9650\u6B8B\u984D", "Grok weekly": "Grok \u306E\u9031\u9593\u5229\u7528\u67A0", "Grok monthly": "Grok \u306E\u6708\u9593\u5229\u7528\u67A0", "Grok billing": "Grok \u306E\u73FE\u5728\u306E\u5229\u7528\u67A0", "Complimentary large models": "\u7121\u6599\u67A0\u30FB\u5927\u578B\u30E2\u30C7\u30EB", "Complimentary small models": "\u7121\u6599\u67A0\u30FB\u5C0F\u578B\u30E2\u30C7\u30EB", "5 hours": "5 \u6642\u9593", "7 days": "7 \u65E5" };
  return exact[value] ?? String(value ?? "").replace(/(\d+) (weeks?|days?|hours?|minutes?|seconds?)\b/g, (_, n, unit) => `${n} ${{ week: "\u9031\u9593", day: "\u65E5", hour: "\u6642\u9593", minute: "\u5206", second: "\u79D2" }[unit.replace(/s$/, "")]}`);
}

// src/settings/format.mjs
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
function date(value, t) {
  if (value === void 0 || value === null || value === "") return null;
  const instant = new Date(typeof value === "number" && value < 1e12 ? value * 1e3 : value);
  return Number.isNaN(instant.getTime()) ? null : instant.toLocaleString(t("dateLocale"), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function percentage(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}
function number(value, t) {
  return new Intl.NumberFormat(t("dateLocale"), { maximumFractionDigits: 2 }).format(value);
}
var message = (value, t, fallback) => t("dateLocale") === "ja-JP" ? messageJa(value, fallback ?? t("failed")) : value;
var label = (value, t) => t("dateLocale") === "ja-JP" ? labelJa(value) : value;
function authentication(provider, t) {
  const auth = provider.auth;
  const state = typeof auth === "string" ? auth : auth?.status;
  const connected = auth?.authenticated === true || ["authenticated", "connected", "logged-in", "logged_in", "ok"].includes(state);
  const label2 = connected ? t("connected") : ["disconnected", "unauthenticated", "logged-out", "logged_out", "missing"].includes(state) ? t("disconnected") : t("unknown");
  return { connected, label: label2, account: typeof auth === "object" ? auth?.account ?? auth?.email : null };
}

// src/settings/providers.jsx
var import_react10 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives9 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/usage-client.jsx
var import_react8 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives7 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime8 = require("react/jsx-runtime");
function hasUsage(usage) {
  if (!usage) return false;
  return (usage.windows ?? []).some((window2) => percentage(window2.remainingPercent) !== null || percentage(window2.usedPercent) !== null) || usage.credits?.unlimited === true || usage.credits?.balance !== null && usage.credits?.balance !== void 0 && /^-?\d+(?:\.\d+)?$/u.test(String(usage.credits.balance)) || usage.individualLimit?.remaining !== void 0 || Number.isFinite(usage.used?.amount) || ["promptTokens", "generatedTokens"].some((key) => Number.isFinite(usage.local?.[key]));
}
function Usage({ usage, t, compact = false }) {
  const windows = Array.isArray(usage?.windows) ? usage.windows : [];
  const credits = usage?.credits;
  const creditValue = typeof credits?.balance === "number" && Number.isFinite(credits.balance) ? number(credits.balance, t) : typeof credits?.balance === "string" && /^-?\d+(?:\.\d+)?$/u.test(credits.balance) ? credits.balance : null;
  const hasCredit = credits?.unlimited === true || creditValue !== null;
  const individual = usage?.individualLimit;
  const spent = usage?.used;
  const status = usage?.stale === true && usage?.status === "available" ? "stale" : usage?.status;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-usage", "aria-label": t("usage"), children: [
    status && ["unavailable", "unsupported", "error", "stale"].includes(status) && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives7.Tag, { tone: status === "error" ? "warning" : "neutral", children: t(status === "unsupported" ? "unavailable" : status) }),
    windows.map((window2, index) => {
      const reportedRemaining = percentage(window2.remainingPercent);
      const reportedUsed = percentage(window2.usedPercent);
      const remaining = reportedRemaining ?? (reportedUsed === null ? null : 100 - reportedUsed);
      const reset = date(window2.resetsAt, t);
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-window", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-line", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: label(window2.label ?? window2.id ?? t("usage"), t) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: remaining === null ? t("unknown") : `${t("remaining")} ${number(remaining, t)}%` })
        ] }),
        remaining !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("progress", { className: remaining <= 10 ? "darask-progress darask-progress-low" : "darask-progress", max: "100", value: remaining, "aria-label": `${label(window2.label ?? t("usage"), t)} ${t("remaining")}` }),
        reset && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "darask-meta", children: [
          t("resets"),
          ": ",
          reset
        ] })
      ] }, window2.id ?? index);
    }),
    hasCredit && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-line darask-credit", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: label(credits.label ?? t(credits.scope === "key-limit" ? "keyAllowance" : "credit"), t) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("strong", { children: [
        credits.unlimited === true ? t("unlimited") : creditValue,
        " ",
        credits.unit ?? ""
      ] })
    ] }),
    individual && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-window", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("individualLimit") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("strong", { children: [
          t("remaining"),
          " ",
          individual.remaining
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-meta", children: [
        t("used"),
        ": ",
        individual.used,
        " \xB7 ",
        t("limit"),
        ": ",
        individual.limit
      ] })
    ] }),
    usage?.local && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "darask-meta darask-sources", children: ["promptTokens", "generatedTokens"].map((key) => typeof usage.local[key] === "number" && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
      t(key === "promptTokens" ? "localPrompt" : "localGenerated"),
      ": ",
      number(usage.local[key], t)
    ] }, key)) }),
    spent && typeof spent.amount === "number" && Number.isFinite(spent.amount) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-spent", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t(spent.scope === "complimentary-daily" ? "complimentaryUsage" : "keyUsage") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("strong", { children: [
          number(spent.amount, t),
          " ",
          spent.unit ?? ""
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "darask-meta darask-sources", children: ["daily", "weekly", "monthly"].filter((period) => typeof spent[period] === "number" && Number.isFinite(spent[period])).map((period) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        t(period),
        ": ",
        number(spent[period], t),
        " ",
        spent.unit ?? ""
      ] }, period)) })
    ] }),
    !hasUsage(usage) && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-muted", children: usage?.message ? message(usage.message, t, t("unknownUsage")) : t("unknownUsage") }),
    !compact && usage?.message && hasUsage(usage) && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-muted", children: message(usage.message, t, t("unknownUsage")) }),
    !compact && (usage?.source || usage?.updatedAt) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-meta darask-sources", children: [
      usage.source && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        t("source"),
        ": ",
        String(usage.source)
      ] }),
      date(usage.updatedAt, t) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        t("updated"),
        ": ",
        date(usage.updatedAt, t)
      ] })
    ] })
  ] });
}
function UsageList({ data, t, compact }) {
  const providers = (data?.providers ?? []).flatMap((provider) => provider.id === "codex" && provider.accounts?.length ? provider.accounts.map((account) => ({ id: account.accountKey, name: `Codex \xB7 ${account.displayName}`, active: account.active, usage: account.usage })) : hasUsage(provider.usage) || provider.id === "claude" && provider.auth === "authenticated" ? [provider] : []);
  const run = data?.browserRun;
  const browserUsage = run?.configured && Number.isFinite(run.observedMs);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
    providers.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("article", { className: "darask-provider", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("header", { className: "darask-provider-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { children: provider.id === "local" ? t("localTitle") : provider.name ?? provider.id }),
        provider.active && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives7.Tag, { tone: "success", children: "\u4F7F\u7528\u4E2D" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Usage, { usage: provider.usage, t, compact })
    ] }, provider.id)),
    browserUsage && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("article", { className: "darask-provider", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("header", { className: "darask-provider-header", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { children: "Cloudflare Browser Run" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-usage", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-line", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("observedTime") }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("strong", { children: [
            number(run.observedMs / 1e3, t),
            " ",
            t("seconds")
          ] })
        ] }),
        !compact && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-muted", children: t("browserUsageHint") })
      ] })
    ] }),
    !providers.length && !browserUsage && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-muted", children: t("usageEmpty") })
  ] });
}
function UsageSidebar(props) {
  const state = props.useDaraskStatus((snapshot) => snapshot);
  const [open, setOpen] = (0, import_react8.useState)(false);
  const { t, wide } = props;
  const refresh = () => {
    void props.action({ action: "refresh" }).catch(() => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask-usage-sidebar", "data-wide": wide, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { className: "darask-usage-trigger", type: "button", "aria-label": t("usageDetails"), title: t("usageTitle"), onClick: () => setOpen(true), children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M4 20V12M10 20V4M16 20V8M22 20H2" }) }),
      wide && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("usageTitle") })
    ] }),
    wide && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask darask-usage-summary", children: [
      state.loading && !state.data ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-muted", children: t("loading") }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(UsageList, { data: state.data, t, compact: true }),
      state.error && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-error", role: "alert", children: message(state.error, t, t("loadFailed")) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives7.Modal, { open, onClose: () => setOpen(false), title: t("usageTitle"), closeLabel: t("close"), className: "darask-usage-modal", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "darask darask-usage-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_dsh_client_ui_primitives7.Button, { variant: "outline", disabled: !!state.pending || state.loading, onClick: refresh, children: t("refresh") }),
      state.error && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-error", role: "alert", children: message(state.error, t, t("loadFailed")) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(UsageList, { data: state.data, t }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "darask-muted", children: t("creditHint") })
    ] }) })
  ] });
}

// src/codex-client.jsx
var import_react9 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives8 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime9 = require("react/jsx-runtime");
function CodexConnection({ refresh }) {
  const [node, setNode] = (0, import_react9.useState)(""), [nodes, setNodes] = (0, import_react9.useState)([]), [ready, setReady] = (0, import_react9.useState)(false);
  const [pending, setPending] = (0, import_react9.useState)(false), [error, setError] = (0, import_react9.useState)("");
  (0, import_react9.useEffect)(() => {
    const controller = new AbortController();
    Promise.all(["/api/darask/codex/connection", "/api/darask/workspaces"].map(async (path) => {
      const response = await fetch(path, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error();
      return response.json();
    })).then(([connection, hosts]) => {
      setNode(connection.node ?? "");
      setNodes((hosts.nodes ?? []).filter((item) => !item.sameMachine));
      setReady(true);
    }).catch(() => {
      if (!controller.signal.aborted) setError("\u5171\u6709\u30E2\u30C7\u30EB\u306E\u8A8D\u8A3C\u5143\uFF08Codex / OpenAI / OpenRouter \u306A\u3069\uFF09\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002");
    });
    return () => controller.abort();
  }, []);
  async function change(value) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/darask/codex/connection", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ node: value || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNode(result.node ?? "");
      await refresh();
    } catch (e) {
      setError(e.message || "\u8A8D\u8A3C\u5143\u3092\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002");
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "darask-provider-fields", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { className: "darask-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "\u5171\u6709\u30E2\u30C7\u30EB\u306E\u8A8D\u8A3C\u5143\uFF08Codex / OpenAI / OpenRouter \u306A\u3069\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("select", { value: node, disabled: !ready || pending, onChange: (event) => void change(event.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("option", { value: "", children: "\u3053\u306E PC \u306E\u8A8D\u8A3C" }),
        nodes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("option", { value: item.id, children: [
          "\u{1F310} ",
          item.name || item.url
        ] }, item.id))
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "darask-muted", children: "\u63A5\u7D9A\u6E08\u307F PC \u3092\u9078\u3076\u3068\u3001\u305D\u306E PC \u3067\u8A2D\u5B9A\u3057\u305F OpenRouter \u306A\u3069\u306E\u30E2\u30C7\u30EB\u304C\u300C\u{1F310} \u2026\uFF08\u8A8D\u8A3C\u5143\uFF09\u300D\u3068\u3057\u3066\u9078\u629E\u6B04\u306B\u8868\u793A\u3055\u308C\u307E\u3059\u3002\u4E00\u89A7\u306F\u7D041\u5206\u3054\u3068\u306B\u66F4\u65B0\u3057\u307E\u3059\u3002\u5171\u6709\u30E2\u30C7\u30EB\u306E\u63A8\u8AD6\u306F\u8A8D\u8A3C\u5143\u3092\u7D4C\u7531\u3057\u3001API \u30AD\u30FC\u306F\u30B3\u30D4\u30FC\u3057\u307E\u305B\u3093\u3002\u30D5\u30A1\u30A4\u30EB\u7DE8\u96C6\u3068\u30B3\u30DE\u30F3\u30C9\u5B9F\u884C\u306F\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9\u306E PC \u3067\u884C\u3044\u307E\u3059\u3002\u4E21\u65B9\u306E PC \u306B\u5BFE\u5FDC\u7248 DARASK \u304C\u5FC5\u8981\u3067\u3059\u3002" }),
    node && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "darask-meta", children: "\u4F1A\u8A71\u30FB\u6DFB\u4ED8\u753B\u50CF\u30FB\u30C4\u30FC\u30EB\u306E\u5FDC\u7B54\u3092\u5171\u6709\u3057\u307E\u3059\u3002Codex \u306E\u753B\u50CF\u751F\u6210\u3084\u81EA\u52D5\u5BE9\u67FB\u306A\u3069\u3001\u5225\u306E\u6A5F\u80FD\u306E\u8A8D\u8A3C\u306F\u5B9F\u884C\u3059\u308B PC \u306E\u8A2D\u5B9A\u306B\u5F93\u3044\u307E\u3059\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { role: "alert", className: "darask-error", children: error })
  ] });
}
function CodexImages() {
  const [status, setStatus] = (0, import_react9.useState)(null), [pending, setPending] = (0, import_react9.useState)(false), [error, setError] = (0, import_react9.useState)("");
  async function read(body, signal) {
    const response = await fetch("/api/darask/media", {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      ...body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {},
      signal: signal ?? AbortSignal.timeout(15e3)
    });
    if (!response.ok) throw new Error("\u753B\u50CF\u751F\u6210\u306E\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002DSH \u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    return response.json();
  }
  (0, import_react9.useEffect)(() => {
    const controller = new AbortController();
    read(null, controller.signal).then(setStatus).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, []);
  async function change(enabled) {
    setPending(true);
    setError("");
    try {
      await read({ enableCodexImages: enabled });
      setStatus(await read());
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "darask-provider-fields", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { children: "GPT \u306E\u753B\u50CF\u751F\u6210" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Switch, { label: "GPT \u306E\u753B\u50CF\u751F\u6210\u3092\u4F7F\u7528\u3059\u308B", checked: status?.codex?.enabled ?? false, disabled: !status || pending, onChange: change })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "darask-muted", children: "\u4F7F\u7528\u4E2D\u306E Codex / ChatGPT \u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u753B\u50CF\u3092\u751F\u6210\u3057\u307E\u3059\u3002OpenAI API \u30AD\u30FC\u306F\u4E0D\u8981\u3067\u3059\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { role: "status", className: "darask-meta", children: !status ? "\u72B6\u614B\u3092\u78BA\u8A8D\u4E2D\u2026" : !status.codex.enabled ? "\u7121\u52B9" : status.codex.registered ? "\u753B\u50CF\u751F\u6210\u30C4\u30FC\u30EB\u3092\u4F7F\u7528\u3067\u304D\u307E\u3059\u3002" : "\u30C4\u30FC\u30EB\u306E\u767B\u9332\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u3002\u72B6\u614B\u304C\u5909\u308F\u3089\u306A\u3044\u5834\u5408\u306F DSH \u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { role: "alert", className: "darask-error", children: error })
  ] });
}
function CodexAccounts({ provider, action, pending, Usage: Usage2, t }) {
  const [callback, setCallback] = (0, import_react9.useState)("");
  const [removing, setRemoving] = (0, import_react9.useState)(null);
  const [feedback, setFeedback] = (0, import_react9.useState)("");
  const [loginUrl, setLoginUrl] = (0, import_react9.useState)(""), [popupBlocked, setPopupBlocked] = (0, import_react9.useState)(false);
  const rows = provider.accounts ?? [];
  const signingIn = provider.login?.status === "running";
  const perform = async (payload) => {
    setFeedback("");
    try {
      const result = await action({ provider: "codex", ...payload });
      if (result?.login?.status === "failed") setFeedback("\u64CD\u4F5C\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u72B6\u614B\u3092\u66F4\u65B0\u3057\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
      else return true;
    } catch {
      setFeedback("\u64CD\u4F5C\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002DSH \u306E\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    }
    return false;
  };
  const beginLogin = async () => {
    setFeedback("");
    setLoginUrl("");
    setPopupBlocked(false);
    try {
      const launched = await openCodexAuthorization(() => action({ provider: "codex", action: "login" }));
      if (launched.result?.login?.status === "failed") {
        setFeedback("\u64CD\u4F5C\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u72B6\u614B\u3092\u66F4\u65B0\u3057\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
        return;
      }
      setLoginUrl(launched.url ?? "");
      if (launched.url && !launched.opened) setPopupBlocked(true);
    } catch {
      setFeedback("\u64CD\u4F5C\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002DSH \u306E\u63A5\u7D9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    }
  };
  const authorizationUrl = signingIn ? provider.login?.url ?? loginUrl : "";
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-codex-accounts", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(CodexConnection, { refresh: () => perform({ action: "refresh" }) }),
    provider.authenticationSource && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("p", { className: "darask-meta", children: [
      "\u8A8D\u8A3C\u5143: \u{1F310} ",
      provider.authenticationSource,
      " \u2014 \u3053\u306E PC \u3067\u3082\u5171\u6709\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(CodexImages, {}),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", variant: "outline", disabled: pending || signingIn || rows.length >= 16, onClick: () => void beginLogin(), children: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u8FFD\u52A0" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", disabled: pending, onClick: () => void perform({ action: "refresh" }), children: "\u72B6\u614B\u3092\u66F4\u65B0" }),
      signingIn && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", disabled: pending, onClick: () => void perform({ action: "cancelLogin" }), children: "\u8FFD\u52A0\u30ED\u30B0\u30A4\u30F3\u3092\u4E2D\u6B62" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "darask-muted", children: "\u6700\u592716\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u4FDD\u5B58\u3067\u304D\u307E\u3059\u3002\u300C\u4F7F\u7528\u3059\u308B\u300D\u3067\u4EE5\u5F8C\u306E Codex \u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u4F7F\u3046\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u9078\u3073\u307E\u3059\u3002Usage \u306F\u5404\u30A2\u30AB\u30A6\u30F3\u30C8\u304B\u3089\u7D041\u5206\u3054\u3068\u306B\u53D6\u5F97\u3057\u307E\u3059\u3002" }),
    signingIn && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "darask-muted", children: "\u5225\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u8FFD\u52A0\u3059\u308B\u5834\u5408\u306F\u3001\u8A8D\u8A3C\u30DA\u30FC\u30B8\u3067\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u5207\u308A\u66FF\u3048\u308B\u304B\u3001\u4E0B\u306E\u8A8D\u8A3C\u30EA\u30F3\u30AF\u3092\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8\u30A6\u30A4\u30F3\u30C9\u30A6\u3067\u958B\u3044\u3066\u304F\u3060\u3055\u3044\u3002" }),
    signingIn && authorizationUrl && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-login", role: "status", children: [
      popupBlocked && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "\u30D6\u30E9\u30A6\u30B6\u30FC\u304C\u8A8D\u8A3C\u753B\u9762\u3092\u81EA\u52D5\u3067\u958B\u3051\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u3092\u8A31\u53EF\u3059\u308B\u304B\u3001\u6B21\u306E\u30EA\u30F3\u30AF\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("a", { href: authorizationUrl, target: "_blank", rel: "noopener noreferrer", children: "ChatGPT \u306E\u8A8D\u8A3C\u753B\u9762\u3092\u958B\u304F \u2197" })
    ] }),
    feedback && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { role: "alert", className: "darask-error", children: feedback }),
    rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "darask-codex-account", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-codex-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { children: row.displayName }),
        row.active && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Tag, { tone: "success", children: "\u4F7F\u7528\u4E2D" })
      ] }),
      row.maskedEmail && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "darask-meta", children: row.maskedEmail }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Usage2, { usage: row.usage, t }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", disabled: pending || signingIn || row.active, onClick: () => void perform({ action: "selectAccount", accountKey: row.accountKey }), children: "\u4F7F\u7528\u3059\u308B" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", disabled: pending || signingIn || row.active && rows.length > 1, onClick: () => setRemoving(row.accountKey), children: "\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u524A\u9664" })
      ] }),
      row.active && rows.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("small", { className: "darask-muted", children: "\u524A\u9664\u3059\u308B\u5834\u5408\u306F\u3001\u5148\u306B\u5225\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u4F7F\u7528\u4E2D\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }),
      removing === row.accountKey && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { role: "alert", className: "darask-login", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("p", { children: [
          "\u3053\u306E DSH \u306B\u4FDD\u5B58\u3057\u305F ",
          row.displayName,
          " \u306E\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3092\u524A\u9664\u3057\u307E\u3059\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "darask-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", disabled: pending, onClick: async () => {
            if (await perform({ action: "removeAccount", accountKey: row.accountKey })) setRemoving(null);
          }, children: "\u524A\u9664\u3059\u308B" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", disabled: pending, onClick: () => setRemoving(null), children: "\u623B\u308B" })
        ] })
      ] })
    ] }, row.accountKey)),
    signingIn && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("details", { className: "darask-codex-callback", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("summary", { children: "Mac \u306A\u3069\u5225\u306E PC \u3067\u30ED\u30B0\u30A4\u30F3\u3059\u308B\u5834\u5408" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "darask-muted", children: "\u8A8D\u8A3C\u30DA\u30FC\u30B8\u3067\u30ED\u30B0\u30A4\u30F3\u5F8C\u3001localhost \u306E\u30DA\u30FC\u30B8\u3092\u958B\u3051\u306A\u304F\u306A\u3063\u305F\u3089\u3001\u305D\u306E\u6642\u306E\u30A2\u30C9\u30EC\u30B9\u5168\u4F53\u3092\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("form", { onSubmit: async (event) => {
        event.preventDefault();
        const callbackUrl = callback.trim();
        setCallback("");
        if (await perform({ action: "submitCallback", callbackUrl })) setFeedback("\u8A8D\u8A3C\u3092\u53D7\u3051\u4ED8\u3051\u307E\u3057\u305F\u3002\u5B8C\u4E86\u3092\u5F85\u3063\u3066\u3044\u307E\u3059\u3002");
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "\u8A8D\u8A3C\u5F8C\u306E\u623B\u308A\u5148 URL" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Input, { type: "password", value: callback, onChange: (event) => setCallback(event.target.value), autoComplete: "off", spellCheck: false })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_dsh_client_ui_primitives8.Button, { size: "sm", type: "submit", disabled: pending || !callback.trim(), children: "\u8A8D\u8A3C\u3092\u5B8C\u4E86" })
      ] })
    ] })
  ] });
}

// src/settings/providers.jsx
var import_jsx_runtime10 = require("react/jsx-runtime");
function localStageLabel(stage, t) {
  if (stage === "ready") return t("localReady");
  if (stage === "loading") return t("localLoadingWeights");
  if (stage === "serving") return t("localServing");
  if (stage === "stopped") return t("localPhaseStopped");
  if (stage === "error") return t("error");
  return t("localStarting");
}
function LocalRuntimePanel({ provider, pending, t, perform }) {
  const runtime = provider.localRuntime;
  const progress = runtime?.progress;
  const stage = progress?.stage ?? runtime?.phase ?? "stopped";
  const percent2 = percentage(progress?.percent);
  const elapsed = Number.isFinite(progress?.elapsedMs) ? Math.round(progress.elapsedMs / 1e3) : null;
  const busy = pending === "startLocal:local" || pending === "stopLocal:local" || pending === "testLocal:local";
  const starting = ["starting", "loading", "serving"].includes(stage) && runtime?.phase !== "ready";
  const remote = runtime?.local === false;
  const test = runtime?.test;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-local-runtime", role: "group", "aria-label": t("localProgress"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: pending || remote || authentication(provider, t).connected || runtime?.owned, onClick: () => perform("startLocal"), children: t("startLocal") }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending || !(runtime?.owned || runtime?.local && (runtime?.reachable || authentication(provider, t).connected)), onClick: () => perform("stopLocal"), children: t("stopLocal") }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending || authentication(provider, t).connected !== true, onClick: () => perform("testLocal"), children: busy && pending === "testLocal:local" ? t("localTesting") : t("testLocal") }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending, onClick: () => perform("refresh"), children: t("refresh") })
    ] }),
    remote && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("localRemoteNoStart") }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-window", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("localProgress") }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: localStageLabel(stage, t) })
      ] }),
      (starting || stage === "ready") && (percent2 === null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("progress", { className: "darask-progress", "aria-label": t("localProgress") }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("progress", { className: "darask-progress", max: "100", value: percent2, "aria-label": t("localProgress") })),
      elapsed !== null && starting && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "darask-meta", children: [
        t("localElapsed"),
        ": ",
        elapsed,
        " ",
        t("seconds")
      ] }),
      progress?.lastLine && starting && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { className: "darask-muted", children: progress.lastLine })
    ] }),
    runtime?.error && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { role: "alert", children: message(runtime.error, t) }),
    test?.ok && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("p", { className: "darask-muted", role: "status", children: [
      t("localTestOk"),
      " \xB7 ",
      test.latencyMs,
      " ms \xB7 ",
      t("localTestReply"),
      ": ",
      test.reply
    ] })
  ] });
}
var OPENAI_DATA_CONTROLS = "https://platform.openai.com/settings/organization/data-controls/sharing";
function ProviderCard({ provider, value, index, count, edit, move, action, pending, t, keys, setKeys, jev, local, editLocal, openai, editOpenAi, visibleModels, editModels }) {
  const auth = authentication(provider, t);
  const login = provider.login;
  const loginUrl = safeUrl(login?.url);
  const loginPending = ["pending", "waiting", "authorizing", "running"].includes(login?.status);
  const [callbackUrl, setCallbackUrl] = (0, import_react10.useState)("");
  const logoutConfirmation = provider.logoutConfirmation?.required === true && Date.parse(provider.logoutConfirmation.expiresAt) > Date.now();
  const perform = (type) => {
    void action({ action: type, provider: provider.id }).catch(() => {
    });
  };
  const providerName = provider.id === "local" ? t("localTitle") : provider.name ?? provider.id;
  const cliOnly = provider.id === "cursor";
  const conversationAndCli = ["grok", "claude"].includes(provider.id);
  const sectionId = `darask-${provider.id}`;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("article", { className: "darask-provider", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("header", { className: "darask-provider-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "darask-rank", "aria-hidden": "true", children: index + 1 }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-provider-name", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { children: providerName }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "darask-meta", children: t(cliOnly ? "cliProvider" : conversationAndCli ? "grokProvider" : "modelProvider") }),
        typeof auth.account === "string" && auth.account && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "darask-meta", children: auth.account })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Tag, { tone: auth.connected ? "success" : "neutral", children: auth.label }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-move", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: index === 0 || pending, onClick: () => move(-1), "aria-label": `${providerName}: ${t("up")}`, title: t("up"), children: "\u2191" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: index === count - 1 || pending, onClick: () => move(1), "aria-label": `${providerName}: ${t("down")}`, title: t("down"), children: "\u2193" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Switch, { checked: value.enabled, onChange: (enabled) => edit({ enabled }), disabled: pending, label: `${providerName}: ${t("enabled")}` })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-provider-sections", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("section", { className: "darask-card-section", "aria-labelledby": `${sectionId}-account`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h4", { className: "darask-card-section-title", id: `${sectionId}-account`, children: t("account") }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "darask-card-section-body", children: provider.id === "codex" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CodexAccounts, { provider, action, pending, Usage, t }) : provider.id === "local" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("localKey") }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.localApiKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, localApiKey: event.target.value })), autoComplete: "new-password" })
        ] }) : provider.id === "deepseek" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending || !auth.connected, onClick: () => perform("logout"), children: t("removeDeepseekKey") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending, onClick: () => perform("refresh"), children: t("refresh") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("deepseekHint") }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("deepseekApiKey") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.deepseekApiKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, deepseekApiKey: event.target.value })), autoComplete: "new-password", spellCheck: false }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("keyHint") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-jev-inline", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-line", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: t("jevTitle") }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "darask-meta", children: [
                  "typesafe-ai/jev \xB7 ",
                  t("jevType")
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Tag, { tone: jev?.configured ? "success" : "neutral", children: jev?.configured ? t("configured") : t("disconnected") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("jevHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("aiGatewayApiKey") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.aiGatewayApiKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, aiGatewayApiKey: event.target.value })), autoComplete: "new-password", spellCheck: false }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("keyHint") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("a", { href: "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys", target: "_blank", rel: "noopener noreferrer", children: [
                t("createAiGatewayKey"),
                " \u2197"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending || !jev?.configured, onClick: () => {
                void action({ action: "logout", provider: "jev" }).catch(() => {
                });
              }, children: t("removeAiGatewayKey") })
            ] })
          ] })
        ] }) : provider.id === "openai" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending || !auth.connected, onClick: () => perform("logout"), children: t("logout") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending, onClick: () => perform("refresh"), children: t("refresh") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-warning", role: "alert", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: t("openaiDangerTitle") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: t("openaiDanger") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: t("openaiDangerMore") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("a", { href: OPENAI_DATA_CONTROLS, target: "_blank", rel: "noopener noreferrer", children: [
              t("openaiDataControls"),
              " \u2197"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("openaiApiKey") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.openaiApiKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, openaiApiKey: event.target.value })), autoComplete: "new-password", spellCheck: false })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("openaiAdminKey") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.openaiAdminKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, openaiAdminKey: event.target.value })), autoComplete: "new-password", spellCheck: false }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("openaiAdminHint") })
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { variant: "outline", size: "sm", disabled: pending || loginPending, onClick: () => perform("login"), children: t("login") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending || !auth.connected, onClick: () => perform("logout"), children: t(logoutConfirmation ? "logoutConfirm" : "logout") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending, onClick: () => perform("refresh"), children: t("refresh") }),
            loginPending && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", disabled: pending, onClick: () => perform("cancelLogin"), children: t("cancelLogin") })
          ] }),
          logoutConfirmation && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "darask-login", role: "status", children: t("logoutConfirmHint") }),
          (loginPending || login?.message || loginUrl || login?.userCode) && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-login", role: "status", children: [
            loginPending && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: t("loginPending") }),
            login?.message && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: message(login.message, t) }),
            login?.userCode && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
              t("userCode"),
              ": ",
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("code", { children: login.userCode })
            ] }),
            loginUrl && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("a", { href: loginUrl, target: "_blank", rel: "noopener noreferrer", children: [
              t("openLogin"),
              " \u2197"
            ] }),
            provider.id === "openrouter" && loginPending && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("details", { className: "darask-codex-callback", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("summary", { children: t("openrouterCallbackToggle") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("openrouterCallbackHelp") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("form", { onSubmit: (event) => {
                event.preventDefault();
                const callback = callbackUrl.trim();
                setCallbackUrl("");
                if (callback) void action({ action: "submitCallback", provider: "openrouter", config: { callbackUrl: callback } }).catch(() => {
                });
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("openrouterCallbackLabel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: callbackUrl, onChange: (event) => setCallbackUrl(event.target.value), autoComplete: "off", spellCheck: false })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Button, { size: "sm", type: "submit", disabled: pending || !callbackUrl.trim(), children: t("openrouterCallbackSubmit") })
              ] })
            ] })
          ] }),
          provider.id === "openrouter" && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("apiKey") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.openrouterApiKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, openrouterApiKey: event.target.value })), autoComplete: "new-password", spellCheck: false })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("managementKey") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "password", value: keys.openrouterManagementKey, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, openrouterManagementKey: event.target.value })), autoComplete: "new-password", spellCheck: false }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("keyHint") })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("section", { className: "darask-card-section", "aria-labelledby": `${sectionId}-model`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h4", { className: "darask-card-section-title", id: `${sectionId}-model`, children: t("model") }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-card-section-body", children: [
          provider.id === "local" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LocalRuntimePanel, { provider, pending, t, perform }),
          cliOnly && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("cliHint") }),
          provider.id === "claude" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("claudeHint") }),
          !cliOnly && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("model") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { value: value.model, disabled: pending, onChange: (event) => edit({ model: event.target.value }), autoComplete: "off", spellCheck: false }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t(provider.id === "openai" ? "openaiModelHint" : "modelHint") })
          ] }),
          MODEL_CATALOGS[provider.id]?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-model-visibility", role: "group", "aria-label": `${providerName}: ${t("modelVisibility")}`, children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: t("modelVisibility") }),
            MODEL_CATALOGS[provider.id].map((model) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "darask-model-visibility-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: model.name }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Switch, { checked: visibleModels?.includes(model.id) === true, disabled: pending, label: `${model.name}: ${t("modelVisibility")}`, onChange: (shown) => editModels(provider.id, model.id, shown) })
            ] }, model.id)),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("modelVisibilityHint") })
          ] }),
          ["cursor", "claude", "grok", "local"].includes(provider.id) && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("executable") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { value: value.executable, disabled: pending, onChange: (event) => edit({ executable: event.target.value }), autoComplete: "off", spellCheck: false }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t(provider.id === "local" ? "localHint" : "executableHint") })
          ] }),
          provider.id === "local" && local && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("remoteHint") }),
            provider.localRuntime?.phase === "starting" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { role: "status", children: t("localStarting") }),
            [["baseUrl", "localUrl"], ["modelFile", "localFile"]].map(([field, title]) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t(title) }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { value: local[field], disabled: pending, onChange: (event) => editLocal({ [field]: event.target.value }), autoComplete: "off", spellCheck: false })
            ] }, field)),
            [["contextSize", "localContext"], ["gpuLayers", "localGpu"]].map(([field, title]) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t(title) }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Input, { type: "number", value: local[field], disabled: pending, onChange: (event) => editLocal({ [field]: Number(event.target.value) }) })
            ] }, field)),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Switch, { checked: local.autoStart, disabled: pending, label: t("localAuto"), onChange: (autoStart) => editLocal({ autoStart }) }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("localSaveHint") }),
            provider.localRuntime?.logFile && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("small", { children: [
              t("localLog"),
              ": ",
              provider.localRuntime.logFile
            ] })
          ] }),
          provider.id === "openai" && openai && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "darask-muted", children: t("openaiHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_dsh_client_ui_primitives9.Switch, { checked: openai.preferComplimentary !== false, disabled: pending, label: t("openaiPrefer"), onChange: (preferComplimentary) => editOpenAi({ preferComplimentary }) }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: t("openaiPreferHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { children: t("openaiTier") }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("select", { value: openai.usageTier ?? "unknown", disabled: pending, onChange: (event) => editOpenAi({ usageTier: event.target.value }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: "unknown", children: t("openaiTierUnknown") }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: "t12", children: t("openaiTier12") }),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: "t35", children: t("openaiTier35") })
              ] })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}

// src/settings/connections.jsx
var import_react11 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives10 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime11 = require("react/jsx-runtime");
function TailscaleConnection({ data, action, pending, t }) {
  const tail = data.tailscale;
  if (!tail) return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "darask-muted", children: "Tailscale \u306E\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026" });
  const perform = (payload) => {
    void action(payload).catch(() => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("article", { className: "darask-provider", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("header", { className: "darask-provider-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "darask-provider-name", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { children: "Tailscale" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Tag, { tone: tail.connected ? "success" : "neutral", children: t(tail.connected ? "connected" : tail.available ? "disconnected" : "unavailable") }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Tag, { children: t(tail.serve === "on" ? "serveActive" : tail.serve === "conflict" ? "serveConflict" : "serveStopped") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-usage", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "darask-muted", children: t("tailHint") }),
      tail.dnsName && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("strong", { children: tail.dnsName }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", variant: "outline", disabled: pending || !tail.connected || tail.serve !== "off", onClick: () => perform({ action: "serveEnable", provider: "tailscale" }), children: t("serveOn") }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", disabled: pending || tail.serve !== "on" || !tail.owned, onClick: () => perform({ action: "serveDisable", provider: "tailscale" }), children: t("serveOff") })
      ] })
    ] })
  ] });
}
function ComputerControl({ data, action, pending, t }) {
  const computer = data.computer ?? { enabled: false, available: true };
  const game = computer.game ?? { name: "", executable: "", args: [], cwd: "", windowTitle: "" };
  const [gameDraft, setGameDraft] = (0, import_react11.useState)(null);
  const currentGame = gameDraft ?? { ...game, args: (game.args ?? []).join("\n") };
  const perform = (payload) => {
    void action(payload).catch(() => {
    });
  };
  const available = computer.available !== false;
  const saveGame = async () => {
    try {
      await action({ action: "saveComputerGame", provider: "computer", config: {
        name: currentGame.name,
        executable: currentGame.executable,
        args: currentGame.args.split("\n").map((value) => value.trim()).filter(Boolean),
        cwd: currentGame.cwd,
        windowTitle: currentGame.windowTitle
      } });
      setGameDraft(null);
    } catch {
    }
  };
  const editGame = (key, value) => setGameDraft((current) => ({ ...current ?? { ...game, args: (game.args ?? []).join("\n") }, [key]: value }));
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("article", { className: "darask-provider", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("header", { className: "darask-provider-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "darask-provider-name", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { children: t("computerTitle") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Tag, { tone: computer.enabled ? "success" : "neutral", children: t(computer.enabled ? "computerReady" : available ? "disabled" : "computerUnavailable") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-usage", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "darask-muted", children: t("computerHint") }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", variant: "outline", disabled: pending || !available || computer.enabled, onClick: () => perform({ action: "enableComputer", provider: "computer" }), children: t("computerOn") }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", disabled: pending || !computer.enabled, onClick: () => perform({ action: "disableComputer", provider: "computer" }), children: t("computerOff") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("details", { className: "darask-details", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("summary", { children: t("gameProfile") }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-fields", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "darask-muted", children: t("gameProfileHint") }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("gameName") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Input, { value: currentGame.name, disabled: pending, onChange: (event) => editGame("name", event.target.value), autoComplete: "off" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("gameExecutable") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Input, { value: currentGame.executable, disabled: pending, onChange: (event) => editGame("executable", event.target.value), autoComplete: "off", spellCheck: false })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("gameArguments") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("textarea", { rows: 3, value: currentGame.args, disabled: pending, onChange: (event) => editGame("args", event.target.value), spellCheck: false })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("gameWorkingDirectory") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Input, { value: currentGame.cwd, disabled: pending, onChange: (event) => editGame("cwd", event.target.value), autoComplete: "off", spellCheck: false })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("gameWindowTitle") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Input, { value: currentGame.windowTitle, disabled: pending, onChange: (event) => editGame("windowTitle", event.target.value), autoComplete: "off" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "darask-actions", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", variant: "primary", disabled: pending || gameDraft === null, onClick: () => {
            void saveGame();
          }, children: t("gameSave") }) })
        ] })
      ] })
    ] })
  ] });
}
function BrowserConnections({ data, action, pending, t }) {
  const run = data.browserRun;
  const [accountId, setAccountId] = (0, import_react11.useState)("");
  const [apiToken, setApiToken] = (0, import_react11.useState)("");
  const perform = (payload) => {
    void action(payload).catch(() => {
    });
  };
  const saveConnection = async () => {
    try {
      await action({ action: "saveBrowserRun", provider: "browserRun", config: { accountId: accountId || run?.accountId, apiToken } });
      setApiToken("");
    } catch {
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-integrations", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("article", { className: "darask-provider", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("header", { className: "darask-provider-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "darask-provider-name", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { children: "Kitesurf" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Tag, { children: t(data.compatibility?.kitesurf ? "enabled" : "disabled") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "darask-usage", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "darask-muted", children: t("browserHint") }) })
    ] }),
    run && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("article", { className: "darask-provider", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("header", { className: "darask-provider-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "darask-provider-name", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { children: "Cloudflare Browser Run" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Tag, { tone: run.connected ? "success" : "neutral", children: t(run.connected ? "connected" : run.configured ? "configured" : "disconnected") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-usage", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "darask-muted", children: t("browserRunHint") }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("a", { href: safeUrl(run.dashboardUrl), target: "_blank", rel: "noopener noreferrer", children: [
          t("dashboard"),
          " \u2197"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("details", { className: "darask-details", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("summary", { children: t("settings") }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-fields", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("cfAccount") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Input, { value: accountId, placeholder: run.accountId || "", disabled: pending, onChange: (e) => setAccountId(e.target.value.trim()), autoComplete: "off" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: t("cfToken") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Input, { type: "password", value: apiToken, disabled: pending, onChange: (e) => setApiToken(e.target.value), autoComplete: "new-password" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "darask-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", variant: "primary", disabled: pending || !apiToken || !(accountId || run.accountId), onClick: () => {
              void saveConnection();
            }, children: t("connectSave") }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_dsh_client_ui_primitives10.Button, { size: "sm", disabled: pending || !run.configured, onClick: () => perform({ action: "removeBrowserRun", provider: "browserRun" }), children: t("disconnectRemove") })
          ] })
        ] })
      ] })
    ] })
  ] });
}

// src/settings/accounts.jsx
var import_jsx_runtime12 = require("react/jsx-runtime");
var BITWARDEN_GUIDES = {
  DEEPSEEK_API_KEY: { title: "bitwardenDeepseekSetup", steps: ["bitwardenDeepseekStep1", "bitwardenDeepseekStep2", "bitwardenDeepseekStep3"], values: ["bitwardenDeepseekValue"], href: "https://api-docs.deepseek.com/", link: "bitwardenDeepseekLink" },
  AI_GATEWAY_API_KEY: { title: "bitwardenGatewaySetup", steps: ["bitwardenGatewayStep1", "bitwardenGatewayStep2", "bitwardenGatewayStep3"], values: ["bitwardenGatewayValue"], href: "https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys", link: "bitwardenGatewayLink" },
  DARASK_R2_ACCESS_KEY_ID: { title: "bitwardenR2Setup", steps: ["bitwardenR2Step1", "bitwardenR2Step2", "bitwardenR2Step3", "bitwardenR2Step4"], values: ["bitwardenR2AccessValue", "bitwardenR2SecretValue"], href: "https://developers.cloudflare.com/r2/api/tokens/", link: "bitwardenR2Link" },
  DARASK_R2_SECRET_ACCESS_KEY: { title: "bitwardenR2Setup", steps: ["bitwardenR2Step1", "bitwardenR2Step2", "bitwardenR2Step3", "bitwardenR2Step4"], values: ["bitwardenR2AccessValue", "bitwardenR2SecretValue"], href: "https://developers.cloudflare.com/r2/api/tokens/", link: "bitwardenR2Link" },
  DARASK_CLOUDFLARE_BROWSER_RUN: { title: "bitwardenBrowserRunSetup", steps: ["bitwardenBrowserRunAccount", "bitwardenBrowserRunToken", "bitwardenBrowserRunSecret", "bitwardenBrowserRunAccess"], values: ["bitwardenBrowserRunValue"], href: "https://developers.cloudflare.com/browser-run/get-started/", link: "bitwardenBrowserRunLink" }
};
function BitwardenGuide({ guide, t }) {
  if (!guide) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("details", { className: "darask-bitwarden-guide", children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("summary", { children: t(guide.title) }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("ol", { children: guide.steps.map((step) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("li", { children: t(step) }, step)) }),
    guide.values.map((value) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("code", { children: t(value) }, value)),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("a", { href: guide.href, target: "_blank", rel: "noopener noreferrer", children: [
      t(guide.link),
      " \u2197"
    ] })
  ] });
}
function configuration(data) {
  const providers = Array.isArray(data?.providers) ? data.providers : [];
  const known = new Set(providers.map((provider) => provider.id));
  const priority = [.../* @__PURE__ */ new Set([...data?.priority ?? [], ...known])].filter((id) => known.has(id));
  return {
    priority,
    routingEnabled: data?.routingEnabled === true,
    purposeRoutes: structuredClone(data?.purposeRoutes ?? {}),
    modelVisibility: structuredClone(data?.modelVisibility ?? defaultModelVisibility()),
    ...data?.local ? { local: { ...data.local } } : {},
    ...data?.openai ? { openai: { ...data.openai } } : {},
    ...data?.bitwarden?.config ? { bitwarden: { ...data.bitwarden.config, secretIds: { ...data.bitwarden.config.secretIds } } } : {},
    providers: Object.fromEntries(providers.map((provider) => [provider.id, {
      enabled: provider.enabled === true,
      model: provider.model ?? "",
      executable: provider.executable ?? ""
    }]))
  };
}
function DaraskPanel(props) {
  const state = props.useDaraskStatus((snapshot) => snapshot);
  const { t } = props;
  const [draft, setDraft] = (0, import_react12.useState)(null);
  const emptyKeys = { bitwardenAccessToken: "", deepseekApiKey: "", openrouterApiKey: "", openrouterManagementKey: "", localApiKey: "", openaiApiKey: "", openaiAdminKey: "", aiGatewayApiKey: "" };
  const [keys, setKeys] = (0, import_react12.useState)(emptyKeys);
  const [saved, setSaved] = (0, import_react12.useState)(false);
  const [tab, setTab] = (0, import_react12.useState)("ai");
  const data = state.data;
  const config = draft ?? configuration(data);
  const dirty = draft !== null || Object.values(keys).some((value) => value !== "");
  const change = (edit) => {
    setDraft((current) => edit(current ?? configuration(data)));
    setSaved(false);
  };
  const pending = state.pending !== null;
  const save = async () => {
    try {
      const credentials = Object.fromEntries(Object.entries(keys).filter(([, value]) => value.trim() !== ""));
      await props.action({ action: "save", config: { ...config, ...credentials } });
      setDraft(null);
      setKeys(emptyKeys);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };
  const providers = new Map((data?.providers ?? []).map((provider) => [provider.id, provider]));
  const modelProviders = config.priority.filter((id) => providers.get(id)?.capability === "model");
  const purposes = ["research", "architecture", "spec_driven", "new", "refactor", "medium", "collaboration", "simple"];
  const compatibilityMessages = [data?.compatibility?.message, ...Array.isArray(data?.compatibility?.warnings) ? data.compatibility.warnings : []].filter((value) => typeof value === "string" && value);
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "darask", "aria-label": t("title"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("header", { className: "darask-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h2", { children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t("description") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Button, { variant: "outline", disabled: pending || state.loading, onClick: () => {
        void props.action({ action: "refresh" }).catch(() => {
        });
      }, children: t("refresh") })
    ] }),
    state.error && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-error", role: "alert", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: message(state.error, t, t("loadFailed")) }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Button, { size: "sm", disabled: pending, onClick: () => {
        void props.load();
      }, children: t("retry") })
    ] }),
    state.loading && !data && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "darask-muted", role: "status", children: t("loading") }),
    data && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "darask-account-tabs", role: "tablist", "aria-label": t("accountTabs"), children: ["ai", "pc", "browser"].map((id, index, tabs) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_dsh_client_ui_primitives11.Button, { id: `darask-tab-${id}`, role: "tab", "aria-selected": tab === id, "aria-controls": `darask-panel-${id}`, tabIndex: tab === id ? 0 : -1, variant: tab === id ? "primary" : "outline", onClick: () => setTab(id), onKeyDown: (event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
        if (next !== null) {
          event.preventDefault();
          setTab(tabs[next]);
          event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
        }
      }, children: [
        t(`${id}Tab`),
        id === "ai" && dirty ? " *" : ""
      ] }, id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-account-panel", id: "darask-panel-ai", role: "tabpanel", "aria-labelledby": "darask-tab-ai", hidden: tab !== "ai", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-routing", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { children: t("routing") }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t("routingHint") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Switch, { checked: config.routingEnabled, disabled: pending, label: t("routing"), onChange: (routingEnabled) => change((current) => ({ ...current, routingEnabled })) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "darask-purpose-routing", "aria-labelledby": "darask-purpose-routing-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-section-heading", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { id: "darask-purpose-routing-title", children: t("purposeRouting") }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t("purposeRoutingHint") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "darask-purpose-grid", children: purposes.map((id) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("label", { className: "darask-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: t(`purpose_${id}`) }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("select", { value: config.purposeRoutes?.[id] ?? "", disabled: pending, onChange: (event) => change((current) => ({ ...current, purposeRoutes: { ...current.purposeRoutes, [id]: event.target.value } })), children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("option", { value: "", children: t("autoPriority") }),
              modelProviders.map((providerId) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("option", { value: providerId, children: providers.get(providerId)?.name ?? providerId }, providerId))
            ] })
          ] }, id)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "darask-jev", "aria-labelledby": "darask-bitwarden-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-provider-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-provider-name", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { id: "darask-bitwarden-title", children: "Bitwarden Secrets Manager" }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "darask-meta", children: t("bitwardenType") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Tag, { tone: data.bitwarden?.configured ? "success" : data.bitwarden?.error ? "warning" : "neutral", children: t(data.bitwarden?.configured ? "configured" : "disconnected") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "darask-card-section", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-card-section-body", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "darask-muted", children: t("bitwardenHint") }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("details", { className: "darask-bitwarden-guide darask-bitwarden-overview", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("summary", { children: t("bitwardenSetup") }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("ol", { children: ["bitwardenSetupStep1", "bitwardenSetupStep2", "bitwardenSetupStep3", "bitwardenSetupStep4", "bitwardenSetupStep5", "bitwardenSetupStep6"].map((step) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("li", { children: t(step) }, step)) }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("a", { href: "https://bitwarden.com/help/secrets-manager-quick-start/", target: "_blank", rel: "noopener noreferrer", children: [
                t("bitwardenSetupLink"),
                " \u2197"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Switch, { checked: config.bitwarden?.enabled === true, disabled: pending, label: t("bitwardenEnabled"), onChange: (enabled) => change((current) => ({ ...current, bitwarden: { ...current.bitwarden, enabled } })) }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: t("bitwardenExecutable") }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Input, { value: config.bitwarden?.executable ?? "", disabled: pending, onChange: (event) => change((current) => ({ ...current, bitwarden: { ...current.bitwarden, executable: event.target.value } })), autoComplete: "off", spellCheck: false, placeholder: "C:\\\\Tools\\\\bws.exe" }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("small", { children: t("bitwardenExecutableHint") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("label", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: t("bitwardenToken") }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Input, { type: "password", value: keys.bitwardenAccessToken, disabled: pending, onChange: (event) => setKeys((previous) => ({ ...previous, bitwardenAccessToken: event.target.value })), autoComplete: "new-password", spellCheck: false }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("small", { children: t("keyHint") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "darask-fields", children: (data.bitwarden?.targets ?? []).filter((target) => target.automatic).map((target) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: target.label }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("small", { children: target.ref }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(BitwardenGuide, { guide: BITWARDEN_GUIDES[target.ref], t })
            ] }, target.ref)) }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Button, { size: "sm", variant: "primary", disabled: pending || dirty || !config.bitwarden?.enabled, onClick: () => {
                void props.action({ action: "syncBitwarden", provider: "bitwarden", config: config.bitwarden }).catch(() => {
                });
              }, children: t("bitwardenSync") }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Button, { size: "sm", disabled: pending || !data.bitwarden?.configured, onClick: () => {
                void props.action({ action: "removeBitwarden", provider: "bitwarden", config: config.bitwarden }).catch(() => {
                });
              }, children: t("bitwardenRemove") })
            ] }),
            data.bitwarden?.lastSyncedAt && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("small", { children: [
              t("bitwardenLastSync"),
              ": ",
              new Date(data.bitwarden.lastSyncedAt).toLocaleString(t("dateLocale"))
            ] }),
            data.bitwarden?.error && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "darask-error", role: "alert", children: data.bitwarden.error })
          ] }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-section-heading", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { children: t("priority") }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t("priorityHint") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-provider-list", children: [
          config.priority.map((id, index) => {
            const provider = providers.get(id);
            if (!provider) return null;
            return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
              ProviderCard,
              {
                provider,
                value: config.providers[id],
                index,
                count: config.priority.length,
                pending,
                t,
                action: props.action,
                keys,
                setKeys,
                jev: data.jev,
                local: config.local,
                openai: config.openai ?? { usageTier: "unknown", preferComplimentary: true },
                visibleModels: config.modelVisibility?.[id] ?? [],
                editModels: (providerId, modelId, shown) => change((current) => {
                  const selected = current.modelVisibility?.[providerId] ?? [];
                  return { ...current, modelVisibility: { ...current.modelVisibility, [providerId]: shown ? [.../* @__PURE__ */ new Set([...selected, modelId])] : selected.filter((id2) => id2 !== modelId) } };
                }),
                editLocal: (patch) => change((current) => ({ ...current, local: { ...current.local, ...patch } })),
                editOpenAi: (patch) => change((current) => ({ ...current, openai: { ...current.openai ?? { usageTier: "unknown", preferComplimentary: true }, ...patch } })),
                edit: (patch) => change((current) => ({ ...current, providers: { ...current.providers, [id]: { ...current.providers[id], ...patch } } })),
                move: (direction) => change((current) => {
                  const priority = [...current.priority];
                  [priority[index], priority[index + direction]] = [priority[index + direction], priority[index]];
                  return { ...current, priority };
                })
              },
              id
            );
          }),
          config.priority.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "darask-muted", children: t("noProviders") })
        ] }),
        compatibilityMessages.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("details", { className: "darask-compatibility", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("summary", { children: t("compatibility") }),
          compatibilityMessages.map((message2, index) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: message2 }, index))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("footer", { className: "darask-footer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { role: "status", children: dirty ? t("unsaved") : saved ? t("saved") : "" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Button, { disabled: !dirty || pending, onClick: () => {
            setDraft(null);
            setKeys(emptyKeys);
            setSaved(false);
          }, children: t("discard") }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_dsh_client_ui_primitives11.Button, { variant: "primary", disabled: !dirty || pending, onClick: () => {
            void save();
          }, children: state.pending?.startsWith("save:") ? t("saving") : t("save") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-account-panel", id: "darask-panel-pc", role: "tabpanel", "aria-labelledby": "darask-tab-pc", hidden: tab !== "pc", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TailscaleConnection, { data, action: props.action, pending, t }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(PcConnections, {})
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "darask-account-panel", id: "darask-panel-browser", role: "tabpanel", "aria-labelledby": "darask-tab-browser", hidden: tab !== "browser", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ComputerControl, { data, action: props.action, pending, t }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(BrowserConnections, { data, action: props.action, pending, t })
      ] })
    ] })
  ] });
}

// src/client.jsx
var name = "darask-harness-client";
var inject = ["slots", "locale", "layout", "sidebarRightTabs"];
function apply(ctx) {
  void Promise.resolve(completeOpenRouterRedirect()).catch(() => {
  });
  registerWorkspaceUi(ctx);
  registerAddonsUi(ctx);
  registerSessionNavigation(ctx);
  ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "darask-development", order: 16, label: () => "\u958B\u767A\u30FB\u66F4\u65B0" }, DevelopmentPanel));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({ name: "settings.general.item", id: "darask-restart", order: 100, locale: NS }, RestartRow));
  const resource = createStatusResource();
  ctx.effect(() => ctx.locale.register(NS, dictionaries), "darask-harness: locale");
  ctx.effect(() => ctx.locale.register("settings.grok", "ja", grok_ja_default), "darask-harness: Grok Japanese");
  ctx.effect(() => ctx.locale.register("settings.openai-codex", "ja", codex_ja_default), "darask-harness: Codex Japanese");
  ctx.effect(() => {
    const style = document.createElement("style");
    style.dataset.dshPlugin = "darask-harness";
    style.textContent = client_default;
    document.head.appendChild(style);
    const stopIcons = decorateAutoPermissionIcons(document);
    return () => {
      resource.dispose();
      style.remove();
      stopIcons?.();
    };
  }, "darask-harness: UI lifetime");
  const t = ctx.locale.bind(NS);
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "darask-accounts",
    order: 5,
    locale: NS,
    label: () => t("title"),
    inject: () => ({ hooks: { daraskStatus: resource.source }, action: resource.action, load: resource.load })
  }, DaraskPanel));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "darask-usage",
    order: 0,
    locale: NS,
    inject: () => ({ hooks: { daraskStatus: resource.source }, action: resource.action, load: resource.load })
  }, UsageSidebar));
}
return module.exports; } });
