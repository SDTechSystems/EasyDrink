# Brief: fotos de producto para EasyDrink

## Qué necesito

EasyDrink es la app de ventas de una tienda de bebidas frías y snacks que se vende en una oficina en Cali. Necesito una foto por producto para que la caja y el inventario se vean claros y bonitos en el celular.

La app ya está preparada: si un producto no tiene foto propia, busca `public/product-photos/<SKU>.webp`. **Solo hay que crear los archivos con el nombre exacto de la tabla.** No hay que cambiar código.

## Entregable

- Un archivo `.webp` por producto en `public/product-photos/`, con el nombre exacto de la columna "Archivo" (mayúsculas y guiones incluidos).
- Imagen cuadrada de **512 × 512 px**, de máximo **60 KB** cada una.
- Un commit con todas las imágenes, en una rama propia, y un pull request.
- Si no puedes generar alguna, déjala fuera y anótala en el pull request. No pongas imágenes de relleno.

## Estilo

- **Fondo:** degradado suave de blanco a lavanda muy claro (`#FFFFFF` a `#EEE9FB`), igual en todas. Sin texto, sin marcos y sin marcas de agua.
- **Producto:** un solo producto, centrado, de frente o en ángulo de tres cuartos, ocupando cerca del 70 % del alto. Sombra suave debajo.
- **Luz:** de estudio, limpia, colores reales y saturados. Que las bebidas se vean frías (gotas de condensación en botellas y latas).
- **Coherencia:** las 62 imágenes deben verse como una sola serie. Mismo fondo, misma escala relativa y mismo ángulo de luz.
- **Recorte:** el producto no debe tocar los bordes. La app muestra la foto en miniatura (48 px) y en tarjeta cuadrada (unos 160 px), así que debe leerse bien en pequeño.
- **Colores de marca de la app**, por si los necesitas para detalles: índigo `#1E1B6E`, violeta `#6A2FD6`.

## Reglas sobre marcas

- Es para uso interno de la tienda (catálogo de su propia caja), no para publicidad.
- Representa cada producto de forma reconocible: color del empaque, forma de la botella o la lata, tamaño.
- No inventes promociones, precios ni texto en la imagen.
- **Si el dueño entrega fotos reales de algún producto, úsalas en lugar de generar una**: recórtalas al formato, ponles el mismo fondo y conviértelas a WebP.

## Cómo comprobarlo

1. `npm ci` y `npm run dev`.
2. Restaura una copia de seguridad que tenga los productos (el dueño la tiene) o crea un producto de prueba con SKU `H2O`.
3. Abre **Caja** y **Productos**: cada producto sin foto propia debe mostrar su imagen de `public/product-photos/`.
4. `npm run build` debe terminar sin errores. Las imágenes `.webp` quedan incluidas para uso sin internet.

## Productos

Los SKU son los mismos que tiene la app. Algunos productos agrupan varios sabores (por ejemplo H2O o Postobón 400 ml). Para esos, muestra 2 o 3 sabores juntos en la misma imagen.

### Aguas

| SKU | Producto | Archivo |
|---|---|---|
| H2O | Agua H2O Sabores 600 ml | `H2O.webp` |
| BRISA-GAS | Agua Brisa con gas 600 ml | `BRISA-GAS.webp` |
| BRISA-MANZANA | Agua Brisa Manzana 600 ml | `BRISA-MANZANA.webp` |
| CIELO-LIMON | Agua Cielo Limón 620 ml | `CIELO-LIMON.webp` |
| CIELO-MANZANA | Agua Cielo Manzana 620 ml | `CIELO-MANZANA.webp` |
| GLACIAL | Agua Glacial sin gas 600 ml | `GLACIAL.webp` |
| POOL | Agua Pool sin gas 600 ml | `POOL.webp` |
| SABORIZADA | Agua Saborizada Surtida 280 ml | `SABORIZADA.webp` |
| SERRANIA | Agua Serranía Maracuyá 600 ml | `SERRANIA.webp` |

### Energéticas

| SKU | Producto | Archivo |
|---|---|---|
| AMPER-BLUE | Amper Blue 473 ml | `AMPER-BLUE.webp` |
| AMPER-PREDATOR | Amper Predator 473 ml | `AMPER-PREDATOR.webp` |
| AMPER-MANGO | Amper Mango 473 ml | `AMPER-MANGO.webp` |
| AMPER-ULTRA | Amper Ultra 473 ml | `AMPER-ULTRA.webp` |
| AMPER-DARK | Amper Dark Energy 473 ml | `AMPER-DARK.webp` |
| MONSTER-MANGO | Monster Mango Loco 473 ml | `MONSTER-MANGO.webp` |
| MONSTER-ORIGINAL | Monster Original 473 ml | `MONSTER-ORIGINAL.webp` |
| MONSTER-ULTRA | Monster Ultra 473 ml | `MONSTER-ULTRA.webp` |
| VIVE-ACAI | Vive 100 Açaí 380 ml | `VIVE-ACAI.webp` |
| VIVE-FUSION | Vive 100 Fusión 380 ml | `VIVE-FUSION.webp` |
| VIVE-ORIGINAL | Vive 100 Original 380 ml | `VIVE-ORIGINAL.webp` |
| VIVE-SANDIA | Vive 100 Sandía Limón 380 ml | `VIVE-SANDIA.webp` |
| VIVE-ULTRA | Vive 100 Ultra 380 ml | `VIVE-ULTRA.webp` |
| VIVE-ZERO | Vive 100 Zero 380 ml | `VIVE-ZERO.webp` |

### Gaseosas

| SKU | Producto | Archivo |
|---|---|---|
| BIG-SODA | Big Soda 400 ml | `BIG-SODA.webp` |
| COCA | Coca Cola Pet 400 ml | `COCA.webp` |
| COCA-ZERO | Coca Cola Zero Pet 400 ml | `COCA-ZERO.webp` |
| POSTOBON400 | Gaseosa Postobón 400 ml (Colombiana / Manzana) | `POSTOBON400.webp` |
| POSTOBON250 | Gaseosa Postobón 250 ml | `POSTOBON250.webp` |
| PONY-LATA | Pony Malta Lata 330 ml | `PONY-LATA.webp` |
| PONY-PET | Pony Malta Pet 330 ml | `PONY-PET.webp` |
| NATUMALTA | Natumalta Pet 200 ml | `NATUMALTA.webp` |
| SPORADE | Sporade Surtido 500 ml | `SPORADE.webp` |

### Té frío

| SKU | Producto | Archivo |
|---|---|---|
| TOPTEA-FRUTOS | Toptea Frutos Rojos 500 ml | `TOPTEA-FRUTOS.webp` |
| TOPTEA-KIWI | Toptea Kiwi Menta 500 ml | `TOPTEA-KIWI.webp` |

### Cervezas

| SKU | Producto | Archivo |
|---|---|---|
| CORONA | Cerveza Corona Cero 330 ml | `CORONA.webp` |

### Snacks y dulces

| SKU | Producto | Archivo |
|---|---|---|
| BOLIQUESO | Cheetos Boliqueso 20 g | `BOLIQUESO.webp` |
| TRIDENT | Chicle Trident Sandía | `TRIDENT.webp` |
| CHOCLITOS | Choclitos (paquete) | `CHOCLITOS.webp` |
| GOL | Chocolatina Gol 31 g | `GOL.webp` |
| JET | Chocolatina Jet 11 g | `JET.webp` |
| JUMBO | Chocolatina Jumbo Surtida 17 g | `JUMBO.webp` |
| DET-ROJO | Detodito BBQ Rojo 45 g | `DET-ROJO.webp` |
| DET-AMARILLO | Detodito Mix Original Amarillo 45 g | `DET-AMARILLO.webp` |
| DET-VERDE | Detodito Limón Verde 45 g | `DET-VERDE.webp` |
| DORITOS | Doritos Megaqueso 34 g | `DORITOS.webp` |
| DORITOS-FLAMIN | Doritos Flamin Hot 200 g | `DORITOS-FLAMIN.webp` |
| DORITOS-DINAMITA | Doritos Dinamita | `DORITOS-DINAMITA.webp` |
| MINICHIPS | Galleta Minichips Chocolate 35 g | `MINICHIPS.webp` |
| CHOKIS-CLASICO | Galletas Chokis Chispas Clásico 37 g (azul) | `CHOKIS-CLASICO.webp` |
| CHOKIS-CHOCOLATE | Galletas Chokis Chocolate 37 g (roja) | `CHOKIS-CHOCOLATE.webp` |
| RITZ | Galleta Ritz Queso 30 g | `RITZ.webp` |
| FESTIVAL | Galletas Festival Vainilla Limón (paquete 4) | `FESTIVAL.webp` |
| OREO | Galletas Oreo BTS (paquete 4) | `OREO.webp` |
| WAFFER | Galletas Waffer Bridge Vainilla | `WAFFER.webp` |
| MANZANA | Manzana Roja | `MANZANA.webp` |
| PAPAS | Papas Fritolay 30 g | `PAPAS.webp` |
| ROSQUILLAS | Rosquillas Caleñitas 15 g | `ROSQUILLAS.webp` |
| TROCI-ORIGINAL | Trocipollo Original | `TROCI-ORIGINAL.webp` |
| TROCI-PICANTE | Trocipollo Picante 50 g | `TROCI-PICANTE.webp` |

### Pastas

| SKU | Producto | Archivo |
|---|---|---|
| IBUFLASH | Ibuflash Migran | `IBUFLASH.webp` |
| BUSCAPINA | Buscapina FEM | `BUSCAPINA.webp` |
| MIELTERTOS | Mieltertos | `MIELTERTOS.webp` |

