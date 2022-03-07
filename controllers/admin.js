const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Product = require("../models/product");

const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if(!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      validationErrors: [],
      errorMessage: 'Attached file is not an image.'
    });
  }

  const errors = validationResult(req);

  if(!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      validationErrors: errors.array(),
      errorMessage: errors.array()[0].msg
    });
  }

  const imageUrl = image.path;

  const product = new Product({ 
    // _id: mongoose.Types.ObjectId('620a54e929f8cde902ee2828'),
    title,
    price,
    description,
    imageUrl,
    userId: req.user
  });

  product
    .save()  
    .then((response) => {
      console.log("Created product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
    //   return res.status(500).render("admin/edit-product", {
    //     pageTitle: "Add Product",
    //     path: "/admin/add-product",
    //     editing: false,
    //     hasError: true,
    //     product: {
    //       title: title,
    //       imageUrl: imageUrl,
    //       price: price,
    //       description: description,
    //     },
    //     validationErrors: [],
    //     errorMessage: 'Database operation failed, please try again.'
    //   });
      // res.redirect('/500');
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
  });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;
  // req.user.getProducts({ where: { id: prodId }})
  Product.findById(prodId)
    .then((product) => {

      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  

  if(!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
  .then(product => {
    if (product.userId.toString() !== req.user._id.toString()) {
     
      return res.redirect('/');
    }

    console.log(image.path);

    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDesc;
    if(image) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    } 

    return product
            .save()
            .then((result) => {
              console.log("Updated product");
              res.redirect("/admin/products");
            })
  })
  .catch((err) => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getProducts = (req, res, next) => {
  // req.user.getProducts()
  Product.find({ userId: req.user._id })
    .populate('userId')
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products"
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then( product => {
    if(!product) {
      return next(new Error('Product not found'))
    }
    fileHelper.deleteFile(product.imageUrl);

    return  Product.deleteOne({_id: prodId, userId: req.user._id})
  }).then(() => {
    console.log("Destoyed product");
    res.status(200).json({message: 'Success!'});
  })
  .catch((err) => {
    res.status(500).json({message: 'Deleting product failed.'});
  });
  
 
   
};
