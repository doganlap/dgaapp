const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { USER_ROLES, USER_STATUSES } = require('../constants/access');

const ADMIN_ROLES = new Set(['super_admin', 'admin']);

const createHttpError = (status, message, details) => {
  const error = new Error(message);
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
};

const isAdmin = (requester) => requester && ADMIN_ROLES.has(requester.role);

const ensureRequester = (requester) => {
  if (!requester) {
    throw createHttpError(401, 'Authentication required');
  }
};

const ensureAdmin = (requester) => {
  ensureRequester(requester);
  if (!isAdmin(requester)) {
    throw createHttpError(403, 'Administrator role required');
  }
};

const ensureSelfOrAdmin = (requester, userId) => {
  ensureRequester(requester);
  if (isAdmin(requester)) {
    return;
  }
  if (requester.id !== userId) {
    throw createHttpError(403, 'You can only modify your own account');
  }
};

const assertOrgScope = (requester, organizationId) => {
  if (!organizationId || requester?.role === 'super_admin') {
    return;
  }

  if (requester.organization_id && requester.organization_id !== organizationId) {
    throw createHttpError(403, 'Organization access denied');
  }
};

const parsePermissions = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const sanitizeUser = (row) => {
  if (!row) return null;
  const {
    password_hash,
    reset_token,
    account_locked_until,
    ...safe
  } = row;

  return {
    ...safe,
    permissions: parsePermissions(row.permissions),
    account_locked_until,
  };
};

const ensureOrganizationActive = async (organizationId) => {
  if (!organizationId) return null;
  const result = await query(
    'SELECT id FROM organizations WHERE id = $1 AND is_active = true',
    [organizationId]
  );

  if (result.rowCount === 0) {
    throw createHttpError(400, 'Organization not found or inactive');
  }

  return result.rows[0];
};

const fetchUserRecord = async (id) => {
  const result = await query(
    `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.department,
        u.job_title,
        u.permissions,
        u.status,
        u.last_login,
        u.organization_id,
        u.created_at,
        u.updated_at,
        o.name AS organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `,
    [id]
  );

  return result.rows[0] ? sanitizeUser(result.rows[0]) : null;
};

const listUsers = async (filters = {}, requester) => {
  ensureAdmin(requester);

  const whereClauses = [];
  const params = [];
  let paramIndex = 0;

  const isActive = filters.is_active ?? true;
  paramIndex += 1;
  whereClauses.push(`u.status = $${paramIndex}`);
  params.push(isActive ? 'active' : 'inactive');

  let organizationId = filters.organization_id;
  if (organizationId) {
    assertOrgScope(requester, organizationId);
  } else if (requester.role !== 'super_admin') {
    organizationId = requester.organization_id;
  }

  if (organizationId) {
    paramIndex += 1;
    whereClauses.push(`u.organization_id = $${paramIndex}`);
    params.push(organizationId);
  }

  if (filters.role) {
    paramIndex += 1;
    whereClauses.push(`u.role = $${paramIndex}`);
    params.push(filters.role);
  }

  const condition = whereClauses.length ? whereClauses.join(' AND ') : '1=1';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const offset = (page - 1) * limit;

  const listResult = await query(
    `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.department,
        u.job_title,
        u.permissions,
        u.status,
        u.last_login,
        u.organization_id,
        u.created_at,
        u.updated_at,
        o.name AS organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE ${condition}
      ORDER BY u.first_name, u.last_name
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `,
    [...params, limit, offset]
  );

  const countResult = await query(
    `
      SELECT COUNT(*) AS total
      FROM users u
      WHERE ${condition}
    `,
    params
  );

  const total = Number(countResult.rows[0].total || 0);

  return {
    data: listResult.rows.map(sanitizeUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getUserById = async (id, requester) => {
  ensureRequester(requester);
  const user = await fetchUserRecord(id);

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  if (!isAdmin(requester) && requester.id !== id) {
    throw createHttpError(403, 'You can only view your own profile');
  }

  return user;
};

const createUser = async (payload, requester) => {
  ensureAdmin(requester);

  const {
    email,
    password,
    first_name,
    last_name,
    organization_id,
    role = 'viewer',
    department,
    job_title,
    permissions = [],
  } = payload;

  if (!USER_ROLES.includes(role)) {
    throw createHttpError(400, 'Invalid role selection');
  }

  let targetOrgId = organization_id || requester.organization_id;
  if (!targetOrgId) {
    throw createHttpError(400, 'Organization is required');
  }

  assertOrgScope(requester, targetOrgId);
  await ensureOrganizationActive(targetOrgId);

  const existing = await query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);

  if (existing.rowCount > 0) {
    throw createHttpError(409, 'A user with this email already exists');
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const result = await query(
    `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name,
        organization_id, role, department, job_title, permissions,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id, email, first_name, last_name, role, department, job_title,
        organization_id, permissions, status, created_at, updated_at
    `,
    [
      uuidv4(),
      email.toLowerCase(),
      passwordHash,
      first_name,
      last_name,
      targetOrgId,
      role,
      department,
      job_title,
      JSON.stringify(permissions),
    ]
  );

  return sanitizeUser(result.rows[0]);
};

const updateUser = async (id, updates, requester) => {
  ensureSelfOrAdmin(requester, id);

  const user = await fetchUserRecord(id);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  if (isAdmin(requester)) {
    assertOrgScope(requester, user.organization_id);
  }

  const allowedFields = ['first_name', 'last_name', 'department', 'job_title'];
  const adminFields = ['role', 'permissions', 'status'];

  if (updates.role && !USER_ROLES.includes(updates.role)) {
    throw createHttpError(400, 'Invalid role');
  }

  if (updates.status && !USER_STATUSES.includes(updates.status)) {
    throw createHttpError(400, 'Invalid status value');
  }

  if (updates.permissions && !Array.isArray(updates.permissions)) {
    throw createHttpError(400, 'Permissions must be an array');
  }

  const setClauses = [];
  const values = [];
  let index = 0;

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      index += 1;
      setClauses.push(`${field} = $${index}`);
      values.push(updates[field]);
    }
  });

  if (isAdmin(requester)) {
    adminFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        index += 1;
        const value =
          field === 'permissions' ? JSON.stringify(updates[field]) : updates[field];
        setClauses.push(`${field} = $${index}`);
        values.push(value);
      }
    });
  } else {
    const hasRestrictedField = adminFields.some((field) =>
      Object.prototype.hasOwnProperty.call(updates, field)
    );
    if (hasRestrictedField) {
      throw createHttpError(403, 'You cannot modify role, permissions, or status');
    }
  }

  if (setClauses.length === 0) {
    throw createHttpError(400, 'No fields to update');
  }

  index += 1;
  setClauses.push(`updated_at = $${index}`);
  values.push(new Date());

  index += 1;
  values.push(id);

  const result = await query(
    `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${index}
      RETURNING 
        id, email, first_name, last_name, role, department, job_title,
        permissions, status, organization_id, updated_at
    `,
    values
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'User not found');
  }

  return sanitizeUser(result.rows[0]);
};

const updateUserRole = async (id, role, requester) => {
  ensureAdmin(requester);

  if (!USER_ROLES.includes(role)) {
    throw createHttpError(400, 'Invalid role');
  }

  const user = await fetchUserRecord(id);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  assertOrgScope(requester, user.organization_id);

  const result = await query(
    `
      UPDATE users
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING 
        id, email, first_name, last_name, role, updated_at, organization_id
    `,
    [role, id]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'User not found');
  }

  return sanitizeUser(result.rows[0]);
};

const resetUserPassword = async (id, newPassword, requester) => {
  ensureAdmin(requester);

  if (!newPassword) {
    throw createHttpError(400, 'New password is required');
  }

  const user = await fetchUserRecord(id);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  assertOrgScope(requester, user.organization_id);

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  const result = await query(
    `
      UPDATE users
      SET password_hash = $1,
          failed_login_attempts = 0,
          account_locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, organization_id
    `,
    [passwordHash, id]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'User not found');
  }

  return sanitizeUser(result.rows[0]);
};

const deleteUser = async (id, requester) => {
  ensureAdmin(requester);

  if (requester.id === id) {
    throw createHttpError(400, 'You cannot delete your own account');
  }

  const user = await fetchUserRecord(id);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  assertOrgScope(requester, user.organization_id);

  const result = await query(
    `
      UPDATE users
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, organization_id, status
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, 'User not found');
  }

  return sanitizeUser(result.rows[0]);
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  USER_ROLES,
  USER_STATUSES,
};
