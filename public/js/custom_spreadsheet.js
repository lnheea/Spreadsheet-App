const template = document.createElement("template");
template.innerHTML = `
  <style>
    .row input {
      flex-grow: 1;
      flex-shrink: 1;
      margin: 5px;
      border: red solid 0.5px;
      font-family: monospace;
      font-size: 12pt;
      padding: 4px;
      text-align: center;
      width: 1ch;
  }
  </style>
  <div id="spread-sheet">
    <h3></h3>
  </div>
`;

class Spreadsheet extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.querySelector("h3").innerText = this.getAttribute("name");
    const spreadSheet = this.shadowRoot.getElementById("spread-sheet");
    const saveButton = document.querySelector("#save");

    const submit = document.querySelector("#save");
    saveButton.addEventListener("click", function () {
      const sheet = document.createElement("div");
      for (let j = 0; j < this.getAttribute("rows"); j++) {
        const row = document.createElement("div");
        row.setAttribute("class", "row");

        for (let i = 0; i < this.getAttribute("cols"); i++) {
          const inp = document.createElement("input");
          row.append(inp);
        }
        sheet.append(row);
      }
      spreadSheet.innerHTML = "";
      spreadSheet.append(sheet);
    });
  }

  static get observedAttributes() {
    return ["rows", "cols"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "rows") {
      this.inputRows = newValue;
    }
    if (name === "cols") {
      this.inputCols = newValue;
    }
  }
}

customElements.define("spread-sheet", Spreadsheet);

//  // console.log(this.getAttribute("rows"));
//  const row1 = document.getElementById("row").value;
//  const col1 = document.getElementById("col").value;
//  console.log(row1, col1);
//  const deleteButton = document.createElement("button");
//  deleteButton.textContent = "Delete";
//  sheet.setAttribute("class", "sheet");
