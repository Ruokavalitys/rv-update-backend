const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const productStore = require('../../db/productStore');
const logger = require('./../../logger');
const fieldValidator = require('../../utils/fieldValidator');
const validators = require('../../utils/validators');

const prodFilter = product => {
    delete product.userid;
    delete product.starttime;
    delete product.endtime;
    return product;
};

router.use(authMiddleware(['ADMIN'], process.env.JWT_ADMIN_SECRET));

router.get('/product/:productId(\\d+)', async (req, res) => {
    try {
        const product = await productStore.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json(prodFilter(product));
    } catch (error) {
        logger.error('Error at %s: %s', req.baseUrl + req.path, error.stack);
    }
});

// Edit product
router.put('/product/:productId(\\d+)', async (req, res) => {
    const errors = [];
    try {
        const product = await productStore.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        product.pgrpid = req.params.pgrpid ? req.params.pgrpid : product.pgrpid;
        product.descr = req.params.descr ? req.params.descr : product.descr;
        product.weight = req.params.weight ? req.params.weight : product.weight;
        if (req.params.weight && req.params.weight < 0) {
            errors.push('Weight can\'t be negative');
        }
        product.barcode = req.params.barcode
            ? req.params.barcode
            : product.barcode;

        if (req.params.barcode) {
            const prod = await productStore.findByBarcode(req.params.barcode);
            if (prod) {
                errors.push('Product already exists with given barcode');
            }
        }

        product.buyprice = req.params.buyprice
            ? req.params.buyprice
            : product.buyprice;
        product.sellprice = req.params.sellprice
            ? req.params.sellprice
            : product.sellprice;
        product.quantity = req.params.quantity
            ? req.params.quantity
            : product.quantity;
        const updatedProduct = await productStore.updateProduct(product);
        return res.status(200).json(prodFilter(updatedProduct));
    } catch (error) {
        logger.error('Error at %s: %s', req.baseUrl + req.path, error.stack);
    }
});

router.get('/', async (req, res) => {
    try {
        var products = await productStore.findAll();
        const prods = products.map(product => {
            return {
                product_id: product.itemid,
                product_name: product.descr,
                product_barcode: product.barcode,
                product_group: product.pgrpid,
                buyprice: product.buyprice,
                sellprice: product.sellprice,
                quantity: parseInt(product.quantity || 0)
            };
        });
        return res.status(200).json({
            products: prods
        });
    } catch (error) {
        logger.error('Error at %s: %s', req.baseUrl + req.path, error.stack);
    }
});

router.post('/', async (req, res) => {
    let productValidators = [
        validators.numericBarcode('barcode'),
        validators.nonEmptyString('descr'),
        validators.positiveNumber('pgrpid'),
        validators.nonNegativeNumber('weight'),
        validators.nonNegativeNumber('count'),
        validators.nonNegativeNumber('buyprice'),
        validators.nonNegativeNumber('sellprice')
    ];

    let errors = fieldValidator.validateObject(req.body, productValidators);
    if (errors.length > 0) {
        logger.error(
            '%s %s: invalid request by user %s: %s',
            req.method,
            req.originalUrl,
            req.rvuser.name,
            errors.join(', ')
        );
        return res.status(400).json({
            error_code: 'bad_request',
            message: 'Missing or invalid fields in request',
            errors
        });
    }

    try {
        const product = await productStore.findByBarcode(req.body.barcode);
        if (product) {
            logger.error(
                '%s %s: barcode %s is already assigned to product %s',
                req.method,
                req.originalUrl,
                req.body.barcode,
                product.descr
            );
            return res.status(403).json({
                error_code: 'barcode_taken',
                message: 'Barcode is already assigned to a product'
            });
        }

        const newProduct = {
            descr: req.body.descr,
            pgrpid: req.body.pgrpid,
            weight: req.body.weight
        };

        const newPrice = {
            barcode: req.body.barcode,
            count: req.body.count,
            buyprice: req.body.buyprice,
            sellprice: req.body.sellprice,
            userid: req.rvuser.userid,
            starttime: new Date(),
            endtime: null
        };

        const newId = await productStore.addProduct(newProduct, newPrice, req.rvuser.userid);
        newProduct.itemid = newId;
        newPrice.itemid = newId;

        logger.info(
            '%s %s: user %s created new product "%s" with id %s',
            req.method,
            req.originalUrl,
            req.rvuser.name,
            newProduct.descr,
            newProduct.itemid
        );

        return res.status(201).json({
            product: newProduct,
            price: newPrice
        });
    } catch (error) {
        logger.error(
            '%s %s: %s',
            req.method,
            req.originalUrl,
            error.stack
        );
        return res.status(500).json({
            error_code: 'internal_error',
            message: 'Internal error'
        });
    }
});

router.get('/:barcode', async (req, res) => {
    var barcode = req.params.barcode;

    if (!barcode.match('(^[0-9]{13})+$')) {
        logger.error('Bad barcode: ' + barcode);
        return res.status(400).json({
            error_code: 'Bad _request',
            message: 'not a barcode'
        });
    } else {
        try {
            const product = await productStore.findByBarcode(barcode);

            if (product) {
                return res.status(200).json({
                    product: product
                });
            } else {
                return res.status(404).json({
                    error_code: 'Not_found',
                    messasge: 'item not found on database'
                });
            }
        } catch (exception) {
            logger.error(
                'Error at %s: %s',
                req.baseUrl + req.path,
                exception.stack
            );
            return res.status(500).json({
                error_code: 'internal_error',
                message: 'Internal error'
            });
        }
    }
});

router.post('/product/:id(\\d+)', async (req, res) => {
    const id = req.params.id;
    const buyprice = parseInt(req.body.buyprice, 10);
    const sellprice = parseInt(req.body.sellprice, 10);
    const quantity = parseInt(req.body.quantity, 10);

    try {
        // check that product exists
        const product = await productStore.findById(id);
        if (!product) {
            logger.error(
                'User tried to do a buy-in for product that does not exist.'
            );
            return res.status(404).json({
                error_code: 'product_not_found',
                message: 'Product not found'
            });
        }

        // check that request is valid
        const errors = [];
        isNaN(buyprice) && errors.push('buyprice should be a number');
        isNaN(sellprice) && errors.push('sellprice should be a number');
        (isNaN(quantity) || quantity <= 0) &&
            errors.push('quantity should be a number > 0');

        if (errors.length > 0) {
            logger.error(
                'Errors occured while doing a buy-in: ' + JSON.stringify(errors)
            );
            return res.status(400).json({
                error_code: 'bad_request',
                message: 'Missing or invalid fields in request',
                errors
            });
        }

        // update information
        await productStore.changeProductStock(
            product.itemid,
            buyprice,
            sellprice,
            product.count + quantity,
            req.rvuser.userid
        );

        // return updated information
        logger.info(
            'Successful buy-in of ' +
                quantity +
                ' pcs of Product #' +
                parseInt(id, 10)
        );
        return res.status(200).json({
            product_id: parseInt(id, 10),
            buyprice: buyprice,
            sellprice: sellprice,
            quantity: product.count + quantity
        });
    } catch (error) {
        logger.error('Error at %s: %s', req.baseUrl + req.path, error.stack);
        return res.status(500).json({
            error_code: 'internal_error',
            message: 'Internal error'
        });
    }
});

module.exports = router;
