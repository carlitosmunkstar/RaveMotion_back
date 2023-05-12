
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {User} = require('../../db');
const { Op } = require('sequelize');

// Método de inicio de sesión
const singIn = async (req, res) => {
  const { mail, password } = req.body;

  try {
    // Buscar usuario
    const user = await User.findOne({ where: { mail: { [Op.iLike]: mail } } });
    if (!user) {
      return res.status(400).json({ message: 'Las credenciales no son válidas.' });
    }

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Las credenciales no son válidas.' });
    }

    // Crear token
    const token = jwt.sign(
      { userId: user.id, email: user.mail },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Establecer la cookie
    res.cookie('jwt', token, { httpOnly: true, sameSite: 'strict' });

    // Enviar respuesta
    res.status(200).json({ message: 'Inicio de sesión exitoso.' });
  } catch (error) {
    res.status(500).json({ message: 'Hubo un error al iniciar sesión.' });
  }
};

module.exports = singIn;