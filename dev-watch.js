module.exports = function(f, stat) {
    // Ignore the dist folder
    return f !== 'dist';
};