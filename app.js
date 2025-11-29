const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const { body, validationResult, check } = require("express-validator");
const methodOverride = require("method-override");

const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

require("./utils/db");
const Siswa = require("./model/siswa");
const User = require("./model/user");

const app = express();
const port = 3000;

// setup method override
app.use(methodOverride("_method"));

// setup ejs
app.set("view engine", "ejs");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// konfigurasi flash
app.use(cookieParser("secret"));
app.use(
  session({
    cookie: { maxAge: 100 * 60 * 60 },
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(flash());

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    req.flash("msg", "Silakan login terlebih dahulu!");
    res.redirect("/login");
  }
};

// halaman login
app.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  
  res.render("login", {
    title: "Login Page",
    layout: "layouts/main-layout",
    msg: req.flash("msg"),
  });
});

// proses login
app.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username harus diisi!"),
    body("password").notEmpty().withMessage("Password harus diisi!"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render("login", {
        title: "Login Page",
        layout: "layouts/main-layout",
        errors: errors.array(),
      });
    }

    try {
      const { username, password } = req.body;
      
      const user = await User.findOne({ username, password });
      
      if (!user) {
        return res.render("login", {
          title: "Login Page",
          layout: "layouts/main-layout",
          errors: [{ msg: "Username atau password salah!" }],
        });
      }

      req.session.userId = user._id;
      req.session.username = user.username;
      
      req.flash("msg", "Login berhasil!");
      res.redirect("/");
      
    } catch (error) {
      console.error(error);
      res.render("login", {
        title: "Login Page",
        layout: "layouts/main-layout",
        errors: [{ msg: "Terjadi kesalahan server!" }],
      });
    }
  }
);

// logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/login");
  });
});

// halaman home 
app.get("/", isAuthenticated, async (req, res) => {
  const siswas = await Siswa.find();

  res.render("home", {
    nama: req.session.username || "Admin",
    title: "Home Page",
    siswas,
    layout: "layouts/main-layout",
    msg: req.flash("msg"),
  });
});

// halaman about
app.get("/about", (req, res) => {
  res.render("about", {
    title: "About Page",
    layout: "layouts/main-layout",
  });
});

// halaman data siswa
app.get("/data-siswa", isAuthenticated, async (req, res) => {
  const siswas = await Siswa.find();

  res.render("data-siswa", {
    title: "Data Siswa",
    layout: "layouts/main-layout",
    siswas,
    msg: req.flash("msg"),
  });
});

// form tambah data siswa
app.get("/data-siswa/add", isAuthenticated, (req, res) => {
  res.render("add-siswa", {
    title: "Add Data Siswa Form",
    layout: "layouts/main-layout",
  });
});

// proses tambah data siswa
app.post(
  "/data-siswa",
  isAuthenticated,
  [
    body("nik")
      .isLength({ min: 16, max: 16 })
      .withMessage("NIK harus 16 digit!")
      .isNumeric()
      .withMessage("NIK harus berupa angka!")
      .custom(async (value) => {
        const duplicate = await Siswa.findOne({ nik: value });
        if (duplicate) {
          throw new Error("NIK Sudah Digunakan!");
        }
        return true;
      }),
    body("nisn")
      .isLength({ min: 10, max: 10 })
      .withMessage("NISN harus 10 digit!")
      .isNumeric()
      .withMessage("NISN harus berupa angka!")
      .custom(async (value) => {
        const duplicate = await Siswa.findOne({ nisn: value });
        if (duplicate) {
          throw new Error("NISN Sudah Digunakan!");
        }
        return true;
      }),
    body("tgl_masuk")
      .custom((value) => {
        const inputDate = new Date(value);
        const maxDate = new Date("2025-11-26");
        
        if (inputDate > maxDate) {
          throw new Error("Tanggal masuk tidak boleh melebihi 26 November 2025!");
        }
        return true;
      }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("add-siswa", {
        title: "Add Data Siswa Form",
        layout: "layouts/main-layout",
        errors: errors.array(),
        siswa: req.body,
      });
    } else {
      Siswa.insertMany(req.body, (error, result) => {
        req.flash("msg", "Data Siswa berhasil ditambahkan!");
        res.redirect("/data-siswa");
      });
    }
  }
);

// proses hapus data siswa
app.delete("/data-siswa", isAuthenticated, async (req, res) => {
  await Siswa.deleteOne({ nisn: req.body.nisn });
  req.flash("msg", "Data Siswa berhasil dihapus!");
  res.redirect("/data-siswa");
});

// form ubah data siswa
app.get("/data-siswa/edit/:nisn", isAuthenticated, async (req, res) => {
  const siswa = await Siswa.findOne({ nisn: req.params.nisn });

  res.render("edit-siswa", {
    title: "Edit Data Siswa Form",
    layout: "layouts/main-layout",
    siswa,
  });
});

// proses ubah data siswa
app.put(
  "/data-siswa",
  isAuthenticated,
  [
    body("tgl_masuk")
      .notEmpty()
      .withMessage("Tanggal masuk harus diisi!")
      .custom((value) => {
        const inputDate = new Date(value);
        const maxDate = new Date("2025-11-26");
        
        if (inputDate > maxDate) {
          throw new Error("Tanggal masuk tidak boleh melebihi 26 November 2025!");
        }
        return true;
      }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("edit-siswa", {
        title: "Edit Contact Form",
        layout: "layouts/main-layout",
        errors: errors.array(),
        siswa: req.body,
      });
    } else {
      Siswa.updateOne(
        { nisn: req.body.nisn },
        {
          $set: {
            tingkat: req.body.tingkat,
            rombel: req.body.rombel,
            tgl_masuk: req.body.tgl_masuk,
            terdaftar: req.body.terdaftar,
          },
        }
      ).then((result) => {
        req.flash("msg", "Data Siswa berhasil diedit!");
        res.redirect("/data-siswa");
      });
    }
  }
);

app.listen(port, () => {
  console.log(`Mongo Contact App | listening at port http://localhost:${port}`);
});