import { body, param } from 'express-validator';

const commonValidationRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Họ tên không được để trống')
    .isLength({ min: 2, max: 50 })
    .withMessage('Họ tên phải có từ 2-50 ký tự'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Số điện thoại không được để trống')
    .matches(/^(0|\+84)[3-9]\d{8}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Địa chỉ cụ thể không được để trống')
    .isLength({ min: 10, max: 200 })
    .withMessage('Địa chỉ cụ thể phải có từ 10-200 ký tự'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('Tỉnh/Thành phố không được để trống'),

  body('district')
    .trim()
    .notEmpty()
    .withMessage('Quận/Huyện không được để trống'),

  body('ward')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Phường/Xã không quá 100 ký tự'),

  body('label')
    .optional()
    .isIn(['home', 'office', 'other'])
    .withMessage('Nhãn địa chỉ không hợp lệ'),

  body('customLabel')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Nhãn tùy chỉnh không quá tăng 20 ký tự')
    .custom((value, { req }) => {
      if (req.body.label === 'other' && !value?.trim()) {
        throw new Error('Nhãn tùy chỉnh bắt buộc khi chọn "Khác"');
      }
      return true;
    }),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái mặc định phải là true/false')
];

export const createAddressValidator = [
  ...commonValidationRules,
];

export const updateAddressValidator = [
  ...commonValidationRules,
  
  param('id')
    .isMongoId()
    .withMessage('ID địa chỉ không hợp lệ')
];

export const addressIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID địa chỉ không hợp lệ')
];
