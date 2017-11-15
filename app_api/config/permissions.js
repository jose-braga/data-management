exports.geographicAccess = function (stat) {
    var accessTable = {
        0: [1,2,3],   // admin
        5: [1,2,3],   // super-manager
        10: [1],    // Lisbon manager
        15: [2],    // Porto manager
        16: [3],    // Aveiro manager
        20: [1,2,3],  // unit level (only a few functionalities)
        30: [1,2,3],  // team level
        40: [1,2,3],
        1000: []    // no access
    };
    return accessTable[stat];
};