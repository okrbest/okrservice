import { sendCoreMessage } from "../messageBroker";

export const consumeInventory = async (
  subdomain,
  config,
  doc,
  old_code,
  action
) => {
  const product = await sendCoreMessage({
    subdomain,
    action: "products.findOne",
    data: { code: old_code },
    isRPC: true,
    defaultValue: {}
  });

  const brandIds = (product || {}).scopeBrandIds || [];

  if ((action === "update" && old_code) || action === "create") {
    const productCategory = await sendCoreMessage({
      subdomain,
      action: "categories.findOne",
      data: { code: doc.category_code },
      isRPC: true
    });

    if (!brandIds.includes(config.brandId) && config.brandId !== "noBrand") {
      brandIds.push(config.brandId);
    }

    const document: any = {
      name: doc.name || "",
      shortName: doc.nickname || "",
      type: doc.is_service ? "service" : "product",
      unitPrice: doc.unit_price,
      code: doc.code,
      productId: doc.id,
      uom: doc.measure_unit_code,
      subUoms: product?.subUoms,
      barcodes: doc.barcodes ? doc.barcodes.split(",") : [],
      categoryId: productCategory ? productCategory._id : product.categoryId,
      categoryCode: productCategory
        ? productCategory.code
        : product.categoryCode,
      description: eval("`" + config.consumeDescription + "`"),
      status: "active",
      scopeBrandIds: brandIds
    };

    if (doc.sub_measure_unit_code && doc.ratio_measure_unit) {
      let subUoms = (product || {}).subUoms || [];
      const subUomCodes = subUoms.map(u => u.uom);

      if (subUomCodes.includes(doc.sub_measure_unit_code)) {
        subUoms = subUoms.filter(u => u.uom !== doc.sub_measure_unit_code);
      }
      subUoms.unshift({
        uom: doc.sub_measure_unit_code,
        ratio: doc.ratio_measure_unit
      });

      document.subUoms = subUoms;
    }

    if (product) {
      await sendCoreMessage({
        subdomain,
        action: "products.updateProduct",
        data: { _id: product._id, doc: { ...document } },
        isRPC: true
      });
    } else {
      await sendCoreMessage({
        subdomain,
        action: "products.createProduct",
        data: { doc: { ...document } },
        isRPC: true
      });
    }
  } else if (action === "delete" && product) {
    const anotherBrandIds = brandIds.filter(b => b && b !== config.brandId);
    if (anotherBrandIds.length) {
      await sendCoreMessage({
        subdomain,
        action: "products.updateProduct",
        data: {
          _id: product._id,
          doc: { ...product, scopeBrandIds: anotherBrandIds }
        },
        isRPC: true
      });
    } else {
      await sendCoreMessage({
        subdomain,
        action: "products.removeProducts",
        data: { _ids: [product._id] },
        isRPC: true
      });
    }
  }
};

export const consumeInventoryCategory = async (
  subdomain,
  config,
  doc,
  old_code,
  action
) => {
  const productCategory = await sendCoreMessage({
    subdomain,
    action: "categories.findOne",
    data: { code: old_code },
    isRPC: true
  });

  const brandIds = (productCategory || {}).scopeBrandIds || [];

  if ((action === "update" && old_code) || action === "create") {
    const parentCategory = await sendCoreMessage({
      subdomain,
      action: "categories.findOne",
      data: { code: doc.parent_code },
      isRPC: true
    });

    if (!brandIds.includes(config.brandId) && config.brandId !== "noBrand") {
      brandIds.push(config.brandId);
    }

    const document = {
      code: doc.code,
      name: doc.name,
      order: doc.order,
      scopeBrandIds: brandIds
    };

    if (productCategory) {
      await sendCoreMessage({
        subdomain,
        action: "categories.updateProductCategory",
        data: {
          _id: productCategory._id,
          doc: {
            ...document,
            parentId: parentCategory
              ? parentCategory._id
              : productCategory.parentId
          }
        },
        isRPC: true
      });
    } else {
      await sendCoreMessage({
        subdomain,
        action: "categories.createProductCategory",
        data: {
          doc: {
            ...document,
            parentId: parentCategory ? parentCategory._id : ""
          }
        },
        isRPC: true
      });
    }
  } else if (action === "delete" && productCategory) {
    const anotherBrandIds = brandIds.filter(b => b && b !== config.brandId);
    if (anotherBrandIds.length) {
      await sendCoreMessage({
        subdomain,
        action: "products.updateProduct",
        data: {
          _id: productCategory._id,
          doc: { ...productCategory, scopeBrandIds: anotherBrandIds }
        },
        isRPC: true
      });
    } else {
      await sendCoreMessage({
        subdomain,
        action: "categories.removeProductCategory",
        data: {
          _id: productCategory._id
        },
        isRPC: true
      });
    }
  }
};
