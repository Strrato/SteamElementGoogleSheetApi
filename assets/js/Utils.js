
exports.defined = variable => {
    return typeof variable !== typeof void(0);
}

exports.satanize = input => {
    return input.replace(/[^A-z0-9_:\-àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ]/g, '');
}