let html5QrCode;

function openScanner() {
    const modal = document.getElementById("scanner-modal");
    modal.style.display = "flex";

    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
    { facingMode: "environment" }, // usa la cámara trasera
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      // Cuando detecta un código, lo pone en el campo de búsqueda
        document.getElementById("codigo-barra").value = decodedText;
        closeScanner();
      buscarProducto(); // llama tu función de búsqueda
    },
    (errorMsg) => {
      // errores silenciosos mientras escanea
    }
    );
}

function closeScanner() {
    if (html5QrCode) {
    html5QrCode.stop().then(() => {
        const modal = document.getElementById("scanner-modal");
        modal.style.display = "none";
    });
    }
}