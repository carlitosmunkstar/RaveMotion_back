const {TicketsSold, Ticket}=require('../../db');
const qrcode = require("qrcode"); // generador de codigo qr
const { v4: uuidv4 } = require("uuid"); // generador de clave unica
const fs = require("fs"); // manejo de carpetas y archivos
const cloudinary = require("cloudinary").v2; // carga de archivos en cloudinary
const tmp = require("tmp"); // generador de archivos temporales para cargar en cloudinary
const { error } = require('console');

const {
    CLOUD_NAME,
    CLOUD_API_KEY,
    CLOUD_API_SECRET,
  } = process.env;

  //CLOUDINARY CONFIGURACION
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_API_SECRET,
  });

  const PostTickets = async (req, res) => {
    const { tickets } = req.body;
    let newTickets = [];
  /*"userId":"96365d2f-0f00-40c6-b9f7-c20359ef3e41",
			"ticketId":"a9b633e3-0f29-4f6f-975e-e3b8af8f590c",
        "mail":"chiringuito@gmail.com",
				"price":22000,*/
    try {
      const resultados = await Promise.all(
        tickets.map(async (ticket) => {
          if(!ticket.eventId||!ticket.userId||!ticket.ticketId||!ticket.mail){
            return res.status(400).json({error:"Su solicitud no se puede procesar, asegurese que los datos requeridos sean correctos."})
          }

          const codigo_ticket = uuidv4();
  
          // Generar el código QR usando la librería qrcode
          const buffer = await qrcode.toBuffer(codigo_ticket, {
            errorCorrectionLevel: "M",
            version: 3,
            margin: 4,
            width: 150,
            color: {
              dark: "#000",
              light: "#fff",
            },
          })

          const archivo_temporal = tmp.fileSync();
          await fs.promises.writeFile(archivo_temporal.name, buffer);

          // Cargar el archivo en Cloudinary
          const resultado = await cloudinary.uploader.upload(
            archivo_temporal.name,
            {
              resource_type: "raw",
              public_id: `code+${codigo_ticket.slice(0, 5)}`,
              format: "png",
            }
          );
          // Eliminar el archivo temporal
          archivo_temporal.removeCallback();
          // Agregar el ticket a la lista de nuevos tickets con la URL del código QR

          //* aumenta en 1 sells de la tanda
          const tanda=await Ticket.findByPk(ticket.ticketId);
          tanda.sells++
          await tanda.save();

          return {
            ...ticket,
            id: codigo_ticket,
            qrImage: resultado.secure_url,
          };
        })
      );
      // Agregar los nuevos tickets a la base de datos
      newTickets = resultados;

      const createdTickets = await TicketsSold.bulkCreate(newTickets);
      if (createdTickets) {
        res.status(200).json(createdTickets);
      } else {
        res.status(400).json("Error al comprar los tickets");
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
module.exports=PostTickets;