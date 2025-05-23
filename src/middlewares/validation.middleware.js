import {body, validationResult} from "express-validator"

const validationBodyRules = [
    // Username: 3-20 characters, alphanumeric, no spaces or special characters
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .isAlphanumeric()
        .withMessage('Username must contain only letters and numbers')
        .escape(),

    // Email: Must be a valid email format
    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail() // Sanitizes email (e.g., converts to lowercase)
        .escape(),

    // Password: At least 8 characters, must include a number and a special character
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character')
        .escape(),

    // FullName: Optional, but if provided, 2-50 characters
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters')
        .escape()
];
const resetPasswordValidation = [
    body("oldPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/\d/)
        .withMessage("Password must contain at least one number")
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage("Password must contain at least one special character")
        .escape(),
    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/\d/)
        .withMessage("Password must contain at least one number")
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage("Password must contain at least one special character")
        .escape(),
];
const updateAccountValidation = [
    body("fullName")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Full name must be between 2 and 50 characters")
        .escape(),
    body("newEmail")
        .trim()
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail()
        .escape(),
];
const checkRules = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
export {
    validationBodyRules,
    checkRules,
    resetPasswordValidation, 
    updateAccountValidation,
};