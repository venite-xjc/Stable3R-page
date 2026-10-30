"use strict";
// Table selection only. No animation, timers, model requests, or tracking.
(() => {
  const data = window.STABLE3R_PAPER_RESULTS;
  if (!data) return;
  let protocol = "mid";
  const dataset = document.getElementById("reconstruction-dataset");
  const poseDataset = document.getElementById("pose-dataset");
  function renderRows(body, sourceRows, start, count, directions) {
    const columns = Array.from({length: count}, (_, i) => {
      const values = [...new Set(sourceRows.map(r => r.values[start+i]).filter(v => v !== null).map(Number))];
      return values.sort((a,b) => directions[i] === "up" ? b-a : a-b);
    });
    const fragment = document.createDocumentFragment();
    for (const row of sourceRows) {
      const tr = document.createElement("tr");
      if (row.method.startsWith("Stable3R")) tr.className = "ours";
      const th = document.createElement("th"); th.scope = "row"; th.textContent = row.method; tr.append(th);
      for (let i=0; i<count; i++) {
        const td = document.createElement("td"), value = row.values[start+i];
        if (value === null) { td.textContent = "—"; td.title = "Not reported in the supplied manuscript"; }
        else if (Number(value) === columns[i][0]) { const b = document.createElement("strong"); b.textContent = value; td.append(b); }
        else { td.textContent = value; if (Number(value) === columns[i][1]) td.className = "runner-up"; }
        tr.append(td);
      }
      fragment.append(tr);
    }
    body.replaceChildren(fragment);
  }
  function reconstruction() {
    const setting = data.reconstruction[protocol], start = setting.datasets.indexOf(dataset.value) * 6;
    renderRows(document.getElementById("reconstruction-body"), setting.rows, start, 6, ["down","down","down","down","up","up"]);
    document.querySelector("#reconstruction-table caption").textContent = `${dataset.value} ${protocol} reconstruction results from the supplied manuscript`;
    document.getElementById("reconstruction-source").textContent = protocol === "long" ? "Paper Table 2" : "Paper Table 1";
    const sparse = {"NRGBD":"2–4 sampled frames", "7-Scenes":"3–5 sampled frames", "TUM-dynamics":"5 uniformly sampled frames"};
    const notes = {sparse:`Sparse protocol: ${sparse[dataset.value]}.`,mid:"Mid-length protocol: uniformly sampled 25-frame sequences.",long:"Paper protocol: 300-frame sequences. Stable3R (direct) retains full history. FrameVGGT* denotes the paper-based frame-level retention reimplementation, applied to both Stable3R and StreamVGGT with 16 mid-memory frames + 4 sparse anchors. The FrameVGGT* baseline uses StreamVGGT."};
    document.getElementById("reconstruction-note").textContent = notes[protocol];
    document.getElementById("missing-note").hidden = !setting.rows.some(r => r.values.slice(start,start+6).includes(null));
  }
  for (const button of document.querySelectorAll("[data-protocol]")) button.addEventListener("click", () => {
    const previous = dataset.value; protocol = button.dataset.protocol;
    for (const other of document.querySelectorAll("[data-protocol]")) other.setAttribute("aria-pressed", String(other === button));
    dataset.replaceChildren(...data.reconstruction[protocol].datasets.map(name => new Option(name, name)));
    if (data.reconstruction[protocol].datasets.includes(previous)) dataset.value = previous;
    reconstruction();
  });
  dataset.addEventListener("change", reconstruction);
  function pose() {
    const start = data.pose.datasets.indexOf(poseDataset.value) * 3;
    renderRows(document.getElementById("pose-body"), data.pose.rows, start, 3, ["down","down","down"]);
    document.querySelector("#pose-table caption").textContent = `${poseDataset.value} camera pose results from the supplied manuscript`;
  }
  poseDataset.addEventListener("change", pose);
  reconstruction(); pose();
})();
