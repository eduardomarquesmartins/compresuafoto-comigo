const UNIT_PRICE = 20;

const getProgressivePricePerPhoto = (photoCount) => {
    if (photoCount >= 20) return 9;
    if (photoCount >= 10) return 10;
    if (photoCount >= 5) return 15;
    return UNIT_PRICE;
};

const calculateProgressiveTotal = (photoCount) => {
    const pricePerPhoto = getProgressivePricePerPhoto(photoCount);
    return {
        pricePerPhoto,
        total: Number((photoCount * pricePerPhoto).toFixed(2)),
    };
};

module.exports = { calculateProgressiveTotal, getProgressivePricePerPhoto };
