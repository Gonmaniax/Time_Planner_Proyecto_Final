from app.models.database import db

class Categoria(db.Model):
    __tablename__ = "categorias"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.Enum("predeterminada","personalizada"), default="personalizada")
    id_usuario = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "tipo": self.tipo,
            "id_usuario": self.id_usuario
        }