// js/prevent-back.js
(function () {
  // Selipkan state dummy ke dalam history
  history.pushState(null, null, location.href);

  // Tangkap event ketika tombol back browser ditekan
  window.addEventListener("popstate", function () {
    history.pushState(null, null, location.href);
    alert(
      "Navigasi tombol kembali telah dinonaktifkan demi keamanan pengerjaan.",
    );
  });
})();
