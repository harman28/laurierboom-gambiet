// Hand-maintained. The daily data update never touches this file.
// One shared game library per opponent club, keyed by Netstand club id. Anyone with a library's link
// can view it and add games (no account). `legacy` is an earlier collection: remove that line once
// its games have been moved to the new library.
const LIBRARY_BASE = "https://library.chessscenes.com/team/";
const GAME_LIBRARIES = {
  25380: { name: "Almere", id: "olcUpj_uQXvqZThNkCwvbKQQ" },
  25668: { name: "Amsterdam West", id: "VVdyXpBrcbqQfMV8XTFoiwzf", legacy: "https://library.chessscenes.com/g/zrQ93fNjWu8UZrY0X39Lv3Ia" },
  25080: { name: "Caissa", id: "a_h6aO_ylZ7gU1CjKEUbpjjT" },
  25381: { name: "De Amstel", id: "ACBL0iGMnNQROFsJf7bj8RMP" },
  26132: { name: "De Queer Schaakclub", id: "VdjV6frygKWGfCjLj6P6nKOB" },
  25359: { name: "De Raadsheer", id: "KLYwBLUxK8miBd2W_x_r_jY8" },
  25081: { name: "ENPS", id: "DBLgPcp6TRQ_imyFcwiWFv8Q" },
  25082: { name: "EsPion", id: "viHz8NdPRjsPf9dY7POGrGsu" },
  24683: { name: "Fischer Z", id: "U556hkVVcxwULI1psl41Rnk-" },
  25274: { name: "Muider Schaakkring", id: "fpdSbRDEsu7gRaS1nDDJPyZd" },
  25275: { name: "Oosten-Toren", id: "jL_DYR9WL1CWPeUwnx9uvs3Q" },
  25358: { name: "Pegasus Amstelveen", id: "-12csvtjOHu3wPZPVZdLUV2L" },
  25670: { name: "VAS", id: "isziKG0GoOFPpMb3hoMbl_ua" },
  25671: { name: "Volewijckers", id: "j1NCnvYk37sCJjxN6LrnEAC7" },
  25382: { name: "Zukertort Amstelveen", id: "6KX8y_mB0SAaDtdG1ffmkXQ0" },
  26007: { name: "Zwart op Wit", id: "ajfHvRguj14e-OALtbzPOduf", legacy: "https://library.chessscenes.com/g/Yg3mGxfTRbeo4IP9iJy_hFH9" },
};
