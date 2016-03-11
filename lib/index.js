"use strict";

function isPattern(candidate) {
  return typeof candidate === "string" && (candidate.charAt(0) === "/" || candidate === "*");
}

function isRouteConfigurationObject(routes) {
  if (typeof routes !== "object") {
    return false;
  }
  for (var path in routes) {
    if (routes.hasOwnProperty(path)) {
      return isPattern(path);
    }
  }
}

function unprefixed(fullStr, prefix) {
  return fullStr.split(prefix)[1];
}

function matchesWithParams(sourcePath, pattern) {
  var sourceParts = sourcePath.split("/").filter(function (s) {
    return s.length > 0;
  });
  var patternParts = pattern.split("/").filter(function (s) {
    return s.length > 0;
  });
  var params = patternParts.map(function (patternPart, index) {
    if (patternPart.match(/:\w+/) !== null) {
      return sourceParts[index];
    } else {
      return null;
    }
  }).filter(function (x) {
    return x !== null;
  });
  var matched = patternParts.every(function (part, i) {
    return part.match(/:\w+/) !== null || part === sourceParts[i];
  });
  return matched ? params : [];
}

function validateSwitchPathPreconditions(sourcePath, routes) {
  if (typeof sourcePath !== "string") {
    throw new Error("Invalid source path. We expected to see a string given " + "as the sourcePath (first argument) to switchPath.");
  }
  if (!isRouteConfigurationObject(routes)) {
    throw new Error("Invalid routes object. We expected to see a routes " + "configuration object where keys are strings that look like '/foo'. " + "These keys must start with a slash '/'.");
  }
}

function validatePatternPreconditions(pattern) {
  if (!isPattern(pattern)) {
    throw new Error("Paths in route configuration must be strings that start " + "with a slash '/'.");
  }
}

function isNormalPattern(routes, pattern) {
  if (pattern === "*" || !routes.hasOwnProperty(pattern)) {
    return false;
  }
  return true;
}

function handleTrailingSlash(paramsFn) {
  if (isRouteConfigurationObject(paramsFn)) {
    return paramsFn["/"];
  }
  return paramsFn;
}

function getParamsFnValue(paramFn, params) {
  var _paramFn = handleTrailingSlash(paramFn);
  if (typeof _paramFn !== "function") {
    return _paramFn;
  }
  return _paramFn.apply(null, params);
}

function splitPath(path) {
  var pathParts = path.split("/");
  if (pathParts[pathParts.length - 1] === "") {
    pathParts.pop();
  }
  return pathParts;
}

function validatePath(sourcePath, matchedPath) {
  if (matchedPath === null) {
    return "";
  }
  var sourceParts = splitPath(sourcePath);
  var matchedParts = splitPath(matchedPath);
  var validPath = sourceParts.map(function (part, index) {
    if (part !== matchedParts[index]) {
      return null;
    }
    return part;
  }).filter(function (x) {
    return x !== null;
  }).join("/");
  return validPath;
}

function validate(_ref) {
  var sourcePath = _ref.sourcePath;
  var matchedPath = _ref.matchedPath;
  var value = _ref.value;
  var routes = _ref.routes;

  var validPath = validatePath(sourcePath, matchedPath);
  if (!validPath) {
    validPath = !routes["*"] ? null : sourcePath;
    var validValue = !validPath ? null : routes["*"];
    return {
      validPath: validPath,
      validValue: validValue
    };
  }
  return { validPath: validPath, validValue: value };
}

function betterMatch(candidate, reference) {
  if (candidate === null) {
    return false;
  }
  if (reference === null) {
    return true;
  }
  return candidate.length >= reference.length;
}

function switchPath(sourcePath, routes) {
  validateSwitchPathPreconditions(sourcePath, routes);
  var matchedPath = null;
  var value = null;
  for (var pattern in routes) {
    if (!isNormalPattern(routes, pattern)) {
      continue;
    }
    validatePatternPreconditions(pattern);
    var params = matchesWithParams(sourcePath, pattern);
    if (sourcePath.search(pattern) === 0 && betterMatch(pattern, matchedPath)) {
      matchedPath = pattern;
      value = routes[pattern];
    }
    // if (params.length > 0 && betterMatch(sourcePath, matchedPath)) {
    //   matchedPath = sourcePath
    //   value = getParamsFnValue(routes[pattern], params)
    // }
    if (params.length > 0 && betterMatch(sourcePath, matchedPath)) {
      var x = splitPath(sourcePath);
      matchedPath = [x[0], x[1], x[2]].join("/");
      value = getParamsFnValue(routes[pattern], params);
    }
    if (isRouteConfigurationObject(routes[pattern]) && params.length === 0) {
      var child = switchPath(unprefixed(sourcePath, pattern), routes[pattern]);
      var nestedPath = pattern + child.path;
      if (child.path !== null && betterMatch(nestedPath, matchedPath)) {
        matchedPath = nestedPath;
        value = child.value;
      }
    }
    if (pattern === sourcePath) {
      return { path: pattern, value: handleTrailingSlash(routes[pattern]) };
    }
  }

  var _validate = validate({
    sourcePath: sourcePath,
    matchedPath: matchedPath,
    value: value,
    routes: routes
  });

  var validPath = _validate.validPath;
  var validValue = _validate.validValue;

  return { path: validPath, value: validValue };
}

module.exports = switchPath;