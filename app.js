const sha256 = require("sha-256-js");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(__dirname + "/users.db", function (err) {
  if (!err) {
    db.serialize(function () {
      db.run(`
                CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                passwd TEXT,
                admin BOOLEAN,
                firstName TEXT,
                lastName TEXT
                )`);
      db.run(`
              CREATE TABLE IF NOT EXISTS public (
                  id INTEGER PRIMARY KEY,
                  name TEXT,
                  sheet TEXT,
                  status BOOLEAN,
                  email TEXT,
                  FOREIGN KEY(email) REFERENCES users(email)
              )`);
    });

    console.log("opened users.db");
  }
});

const express = require("express");
const hbs = require("express-hbs");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const flash = require("connect-flash");
const cookieSession = require("cookie-session");
const app = express();
const CSV = require("csv-string");
const textBody = bodyParser.text();

app.use(express.static(__dirname + "/public"));
app.use("/js", express.static(__dirname + "/public/js"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "session",
    secret: "foo",
  })
);

app.engine(
  "hbs",
  hbs.express4({
    partialsDir: __dirname + "/views/partials",
    defaultLayout: __dirname + "/views/layout/main.hbs",
  })
);
app.set("view engine", "hbs");
app.set("views", __dirname + "/views/partials");
app.use(flash());

const port = 8000;

function authenticate(req, res, next) {
  if (req.session.login) {
    next();
  } else {
    res.type(".html");
    res.render("not-logged-in", {
      req: req,
    });
  }
}

function authenticateAdmin(req, res, next) {
  if (req.session.login && req.session.admin === 1) {
    next();
  } else {
    res.type(".html");
    res.render("not-logged-in", {
      req: req,
    });
  }
}

function generate_users_page(req, res) {
  db.all("SELECT * FROM users where admin=0", [], function (err, rows) {
    if (!err) {
      console.log(rows);
      res.type(".html"); // set content type to html
      res.render("users", {
        users: rows,
        title: "Admin Page",
        req: req,
      });
    }
  });
}

// ADMIN SHEETS PAGE
function generate_sheets_page(req, res) {
  console.log("hits hards");
  db.all("SELECT * FROM public", [], function (err, rows) {
    if (!err) {
      if (rows.status === 0) {
        rows.status = false;
      } else if (rows.status === 1) {
        rows.status = false;
      }
      console.log("rows sheets", rows);
      res.type(".html"); // set content type to html
      res.render("allSheets", {
        sheets: rows,
        title: "Home",
        req: req,
      });
    }
  });
}

// USER SHEETS PAGE
function generate_user_sheets_page(req, res) {
  console.log("hits hards");
  db.all("SELECT * FROM public where email=?", [req.session.email], function (
    err,
    rows
  ) {
    if (!err) {
      console.log("rows sheets", rows);
      res.type(".html"); // set content type to html
      res.render("home", {
        userSheets: rows,
        req: req,
      });
    }
  });
}

function generate_home_page(req, res) {
  let user = req.session;
  console.log("req", req.session.firstName);
  db.all(
    "SELECT FROM users where firstName=?, lastName=?",
    [user.firstName, user.lastName],
    function (err, rows) {
      if (!err) {
        res.type(".html");
        res.render("home", {
          req: req,
        });
      }
    }
  );
}

app.get("/home", authenticate, function (req, res) {
  generate_user_sheets_page(req, res);
});

// In order to add admin access set admin to true when database is loaded
// Currently the dasbase has one admin:
// lnheea@mun.ca --> email
// 1 --> pass
app.get("/loadDB", function (req, res) {
  db.serialize(function () {
    db.run(
      "INSERT INTO users (email, passwd, admin, firstName, lastName) VALUES(?, ?, ?, ?, ?)",
      ["lnheea@mun.ca", sha256("1"), 1, "Lutfon Nahar", "Heea"]
    );
    db.run(
      "INSERT INTO users (email, passwd, admin, firstName, lastName) VALUES(?, ?, ?, ?, ?)",
      ["lnheea@n.ca", sha256("1"), 0, "Lutfon Nahar", "Heea"]
    );
    db.run(
      "INSERT INTO users (email, passwd, admin, firstName, lastName) VALUES(?, ?, ?, ?, ?)",
      ["lnheea@mn.ca", sha256("1"), 0, "Lutfon Nahar", "Heea"]
    );
    db.run(
      "INSERT INTO users (email, passwd, admin, firstName, lastName) VALUES(?, ?, ?, ?, ?)",
      ["l@mn.ca", sha256("1"), 0, "L", "Heea"]
    );
  });
  res.redirect("/");
});

app.get("/", function (req, res) {
  if (req.session.login === true) {
    res.redirect("/home");
  } else {
    res.redirect("/indexx.html");
  }
});

// Admin USERS GET ENDPOINT
app.get("/users", authenticateAdmin, function (req, res) {
  generate_users_page(req, res);
});

// Admin SHEETS GET ENDPOINT
app.get("/allSheets", authenticateAdmin, function (req, res) {
  generate_sheets_page(req, res);
});

app.get("/failed_registration", function (req, res) {
  res.type(".html");
  res.render("failed_registration", {
    title: "Failed Registration",
  });
});

app.get("/failed_login", function (req, res) {
  res.type(".html");
  res.render("failed_login", {
    title: "Failed Login",
  });
});

app.post("/add-new-user", function (req, res) {
  const details = req.body;
  console.log(details);
  console.log("add new user", details);
  db.run(
    "INSERT INTO users (email,passwd,admin,firstName,lastName) VALUES(?, ?, ?, ?, ?)",
    [
      details.uname,
      sha256(details.psw),
      false,
      details.firstName,
      details.lastName,
    ],
    function (err) {
      if (!err) {
        console.log("succesfully registered");
        req.session.email = details.uname;
        req.session.pwd = details.pwd;
        req.session.admin = 0;
        req.session.firstName = details.firstName;
        req.session.lastName = details.lastName;
        req.session.login = true;
        generate_home_page(req, res);
        // req.flash("success", "Successfully Signed Up! Nice to meet you " + req.body.firstName + req.body.lastName);
        res.redirect("/home");
      } else {
        res.redirect("/failed_registration");
      }
    }
  );
});

app.get("/login", function (req, res) {
  generate_users_page(req, res);
});

app.post("/login", jsonParser, function (req, res) {
  const details = req.body;
  console.log(details);
  db.get(
    "SELECT * FROM users WHERE email=? AND passwd=?",
    [details.uname, sha256(details.psw)],
    function (err, row) {
      if (row) {
        req.session.email = row.email;
        req.session.pwd = row.passwd;
        req.session.admin = row.admin;
        req.session.firstName = row.firstName;
        req.session.lastName = row.lastName;
        req.session.login = true;
        generate_home_page(req, res);
        res.redirect("/home");
      } else {
        res.redirect("/failed_login");
      }
    }
  );
});

app.get("/logout", function (req, res) {
  req.session.login = false;
  console.log("logout", req.session.login);
  res.redirect("/");
});

app.post("/logout", function (req, res) {
  req.session.email = null;
  req.session.pwd = null;
  req.session.admin = null;
  req.session.firstName = null;
  req.session.lastName = null;
  req.session.login = false;
  res.redirect("/");
});

app.get("/spreadsheet", authenticate, function (req, res) {
  res.type(".html");
  res.render("make-spreadsheet", {
    sess: req.session,
    title: "Create Spreadsheet",
    req: req,
  });
});

// list all the spread sheets in the data base FOR USER
app.get("/sheet-list", function (req, res) {
  const email = req.session.email;
  db.all("SELECT name, status FROM public WHERE email=?", [email], function (
    err,
    rows
  ) {
    if (!err) {
      // const names = rows.map((x) => x.name);
      res.send(rows); // already a string
      console.log("sending", rows);
    } else {
      res.send({ err: err });
    }
  });
});

// retrieves the named sheet
app.get("/sheet/:name", function (req, res) {
  const name = req.params.name;
  const email = req.session.email;
  db.get("SELECT sheet FROM public where name = ?", [name], function (
    err,
    row
  ) {
    if (!err) {
      res.send(row.sheet); // already a string
    } else {
      res.send({ err: err });
      console.log(err);
    }
  });
});

app.get("/sheet/:name", function (req, res) {
  const email = req.session.email;
  const name = req.params.name;
  db.all("SELECT name, status FROM public WHERE email=?", [email], function (
    err,
    rows
  ) {
    if (!err) {
      // const names = rows.map((x) => x.name);
      res.send(rows); // already a string
      console.log("sending", rows);
    } else {
      res.send({ err: err });
    }
  });
});

// Handler to add sheets
app.post("/sheet/:name", jsonParser, (req, res) => {
  const name = req.params.name;
  const values = req.body.values;
  const status = req.body.status;
  const email = req.session.email;
  // values is now an object, but to store it in the database
  // it has to be stringified again (this can be avoided, but
  // I am keeping the example simple)
  const strValues = JSON.stringify(values);
  db.run(
    `INSERT INTO public (name,sheet,status,email) VALUES(?,?,?,?)`,
    [name, strValues, status, email],
    function (err) {
      if (!err) {
        res.send({ ok: true }); // converts to JSON
      } else {
        res.send({ ok: false }); // converts to JSON
      }
    }
  );
});

// Handler to update name and status
app.put("/sheet/:id", jsonParser, function (req, res) {
  const id = parseInt(req.params.id);
  const name = req.body.name;
  const values = req.body.values;
  const status = req.body.status;
  const strValues = JSON.stringify(values);

  db.run(
    `UPDATE public SET name=?, sheet=?, status=? WHERE id=? AND email = ?`,
    [name, strValues, status, id, req.session.email],
    function (err) {
      if (!err) {
        res.send({ status: "successful" });
      } else {
        res.send({ status: err });
      }
    }
  );
});

// Handler to update name and status
app.put("/value-update/:name", jsonParser, function (req, res) {
  const name = req.params.name;
  const values = req.body.values;
  const strValues = JSON.stringify(values);

  db.run(
    `UPDATE public SET sheet=? WHERE name=? AND email = ?`,
    [strValues, name, req.session.email],
    function (err) {
      if (!err) {
        res.send({ ok: true });
      } else {
        res.send({ ok: false });
      }
    }
  );
});

// Handler to copy sheets
app.put("/copy-sheet/:name", jsonParser, function (req, res) {
  const name = req.body.name;
  db.serialize(function () {
    db.get(`SELECT * FROM public where name=?`, [name], function (err) {
      if (!err) {
        res.send({ status: "successful" });
      } else {
        res.send({ status: err });
      }
    });
    db.get("SELECT last_insert_rowid()", [], function (err, row) {
      let id = row["last_insert_rowid()"];
      let post = { id: id };
      generate_notes_page(req, res);
    });
  });

  // db.run(
  //   `UPDATE public SET name=?, sheet=?, status=? WHERE email = ?`,
  //   [name, strValues, status, req.session.email],
  //   function (err) {
  //     if (!err) {
  //       res.send({ status: "successful" });
  //     } else {
  //       res.send({ status: err });
  //     }
  //   }
  // );
});

// Handler to delete sheets
app.delete("/sheet/:id", jsonParser, function (req, res, next) {
  let id = req.params.id;
  db.run(`DELETE FROM public WHERE id=?`, [id], function (err) {
    if (!err) {
      res.send({ ok: true });
    } else {
      console.log(err);
    }
  });
});

app.get("/profile-settings", authenticate, function (req, res) {
  res.type(".html");
  res.render("profile-settings", {
    sess: req.session,
    title: "Status",
    req: req,
  });
});

app.put("/updatePassword", jsonParser, function (req, res) {
  let change = req.body;
  let newPassword = sha256(change.newPassword);
  let email = req.session.email;
  db.run(
    "UPDATE users SET passwd=? WHERE email=?",
    [newPassword, email],
    function (err) {
      if (!err) {
        res.send({ status: "Successful" });
      } else {
        res.send(err);
      }
    }
  );
});

app.put("/update-user", jsonParser, function (req, res) {
  let email = req.body.email;
  let passwd = sha256(req.body.passwd);
  let firstname = req.body.firstname;
  let lastname = req.body.lastname;
  db.run(
    `UPDATE users SET passwd=?, firstName=?, lastName=? WHERE email=?`,
    [passwd, firstname, lastname, email],
    function (err) {
      if (!err) {
        res.send({ status: "successful" });
      } else {
        res.send({ status: "failed" });
      }
    }
  );
});

// // THIS HANDLER NOT WORKING
// app.put("/update-all-sheet", jsonParser, function (req, res) {
//   let email = req.body.email;
//   let name = req.body.name;
//   db.run(`UPDATE public SET name=? WHERE email=?`, [name, email], function (
//     err
//   ) {
//     if (!err) {
//       console.log("updates sheet");
//       res.send({ status: "successful" });
//     } else {
//       console.log(err);
//       res.send({ status: "failed" });
//     }
//   });
// });

app.put("/user/:email", jsonParser, function (req, res) {
  let email = req.params.email;
  const user = req.body; // XXX more error checking
  db.run(
    "UPDATE users SET passwd=?, firstName=?, lastName=? WHERE email=?",
    [sha256(user.passwd), user.firstName, user.lastName, email],
    function (err) {
      if (!err) {
        res.send({ email: email, status: "updated" });
      } else {
        res.send({ email: email, error: err });
      }
    }
  );
});

app.delete("/user/:email", function (req, res) {
  let email = req.params.email;
  db.run(`DELETE FROM users WHERE email=?`, [email], function (err) {
    if (!err) {
      res.send({ email: email, status: "deleted" });
    } else {
      res.send({ email: email, error: err });
    }
  });
});

// SHOWS SHARED
app.get("/public", function (req, res) {
  let email = req.session.email;
  db.all("SELECT name,email FROM public WHERE status = true", [], function (
    err,
    rows
  ) {
    if (!err) {
      // const names = rows.map((x) => x.name);
      //res.send(names); // already a strin
      res.type(".html");
      res.render("public", {
        names: rows,
      });
    } else {
      res.send({ err: err });
    }
  });
});

app.get("/public", authenticate, function (req, res) {
  res.type(".html");
  res.render("public", {
    sess: req.session,
    title: "Status",
    req: req,
  });
});

// note the textBody middleware to access the text
app.put("/csv-import/:name", textBody, (req, res) => {
  const name = req.params.name;
  const sheet = CSV.parse(req.body);
  console.log("importing", req.body);

  console.log(sheet);
  const strValues = JSON.stringify(sheet);
  // insert it into the data base
  db.run(
    `INSERT OR REPLACE INTO public (name,sheet,email) VALUES(?,?,?)`,
    [name, strValues, req.session.email],
    function (err) {
      if (!err) {
        res.send({ ok: true }); // converts to JSON
        console.log("hits");
      } else {
        res.send({ ok: false }); // converts to JSON
      }
    }
  );
});

app.put("/csv-export", jsonParser, (req, res) => {
  const values = req.body;
  let csv = "";
  for (let row of values) {
    csv += CSV.stringify(row);
  }
  res.set("Content-Type", "text/plain");
  res.send(csv);
});

app.get("/csv-export/:name", (req, res) => {
  const name = req.params.name;
  db.get("SELECT sheet FROM sheets where name = ?", [name], function (
    err,
    row
  ) {
    if (!err) {
      // convert to javascript object
      let values = JSON.parse(row.sheet);
      let csv = "";
      for (let row of values) {
        csv += CSV.stringify(row);
      }
      res.set("Content-Type", "text/plain");
      // tell the browsers to down load to a file
      res.set("Content-Disposition", `attachment; filename="${name}.csv"`);
      res.send(csv);
    } else {
      res.status(404).send("not found");
    }
  });
});

app.get("/sheet-chart-list", function (req, res) {
  db.all("SELECT name FROM public", [], function (err, rows) {
    if (!err) {
      const names = rows.map((x) => x.name);
      res.send(names); // already a string
      console.log("sending", names);
    } else {
      res.send({ err: err });
    }
  });
});

// ADMIN SHEET DELETE
app.delete("/sheets/:email", jsonParser, function (req, res) {
  let email = req.params.email;
  let name = req.body.name;
  console.log("req", name);
  db.run(`DELETE FROM public WHERE name = ?`, [name], function (err) {
    if (!err) {
      res.send({ status: "deleted" });
    } else {
      res.send({ error: err });
    }
  });
});

app.get("/charting", authenticate, function (req, res) {
  res.type(".html");
  res.render("charting", {
    sess: req.session,
    title: "Status",
    req: req,
  });
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
