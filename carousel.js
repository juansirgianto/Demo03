let index = 0;
let currentImages = [];

export function initCarousel() {
  const carouselImage = document.getElementById("carouselImage");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const scrollContainer = document.getElementById("thumbnailScroll");
  const thumbLeft = document.getElementById("thumbLeft");
  const thumbRight = document.getElementById("thumbRight");
  const carouselWrapper = document.getElementById("carouselWrapper");
  const carousel = document.getElementById("carouselContainer");
  const thumbnail = document.getElementById("thumbnailScroll");

  function updateCarousel() {
    if (!currentImages.length) return;
    carouselImage.src = currentImages[index];

    const thumbnails = document.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb, idx) => {
      thumb.classList.toggle("border-blue-500", idx === index);
      thumb.classList.toggle("border-transparent", idx !== index);
    });
  }

  function renderThumbnails() {
    thumbnail.innerHTML = "";
    currentImages.forEach((imgSrc, idx) => {
      const thumb = document.createElement("img");
      thumb.src = imgSrc;
      thumb.dataset.index = idx;
      thumb.className = "thumbnail w-30 h-24 object-cover cursor-pointer border-2 border-transparent rounded";
      thumb.addEventListener("click", () => {
        index = idx;
        updateCarousel();
      });
      thumbnail.appendChild(thumb);
    });
  }

  function openFullscreen(element) {
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
  }

  // Navigasi kiri-kanan
  prevBtn.addEventListener("click", () => {
    index = (index - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
  });

  nextBtn.addEventListener("click", () => {
    index = (index + 1) % currentImages.length;
    updateCarousel();
  });

  // Scroll thumbnail kiri/kanan
  thumbLeft.addEventListener("click", () => {
    scrollContainer.scrollBy({ left: -150, behavior: "smooth" });
  });

  thumbRight.addEventListener("click", () => {
    scrollContainer.scrollBy({ left: 150, behavior: "smooth" });
  });

  // Klik luar → tutup
  carouselWrapper.addEventListener("click", (e) => {
    if (e.target === carouselWrapper) {
      carouselWrapper.classList.add("hidden");

      // Tampilkan deskripsi kembali jika mobile
      if (window.innerWidth <= 964) {
        document.querySelectorAll(".description-box").forEach(box => {
          box.classList.remove("hidden");
        });
      }
    }
  });

  // Fullscreen jika klik gambar
  carouselImage.addEventListener("click", () => {
    openFullscreen(carouselImage);
  });

  // Global handler tombol Gallery
  document.querySelectorAll(".galleryBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const images = JSON.parse(btn.dataset.images || "[]");
      if (images.length > 0) {
        index = 0;
        currentImages = images;
        renderThumbnails();
        updateCarousel();
        carouselWrapper.classList.remove("hidden");
        carousel.classList.remove("hidden");
        thumbnail.classList.remove("hidden");

        if (window.innerWidth <= 964) {
          document.querySelectorAll(".description-box").forEach(box => {
            box.classList.add("hidden");
          });
        }
      }
    });
  });
}
