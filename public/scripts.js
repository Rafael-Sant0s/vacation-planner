const API_URL = "https://vacation-planner-dzc6.onrender.com";

// Altera o estado das telas.
const toggleTela = (telaId, show) => {
  const tela = document.getElementById(telaId);
  const homePage = document.getElementById("telaPrincipal");

  tela.style.display = show ? "block" : "none";
  homePage.style.display = show ? "none" : "block";

  if (!show) tela.innerHTML = "";
};

// Faz o fetch do HTML da tela que será renderizada.
const carregarTela = (btnSelector, telaId, htmlFile) => {
  const promises = [];
  document.querySelectorAll(btnSelector).forEach((btn) => {
    const promise = fetch(htmlFile)
      .then((response) => response.text())
      .then((html) => {
        const container = document.getElementById(telaId);
        container.innerHTML = html;

        // Evita duplicar o CSS.
        if (!document.querySelector('link[href="styleForm.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "styleForm.css";
          document.head.appendChild(link);
        }

        inicializarCadastro(telaId);
        toggleTela(telaId, true);
      })
      .catch((err) => console.error(`Erro ao carregar ${htmlFile}:`, err));

    promises.push(promise);
  });

  return promises[0];
};

// Calcular o status do funcionário.
function calcularStatus(inicio, fim) {
  if (!inicio || !fim || inicio === "-----" || fim === "-----") {
    return "semAgendamento";
  }
  const hoje = new Date();
  const inicioDate = new Date(inicio + "T00:00:00");
  const fimDate = new Date(fim + "T00:00:00");

  if (isNaN(inicioDate) || isNaN(fimDate)) {
    return "semAgendamento";
  }

  hoje.setHours(0, 0, 0, 0);
  inicioDate.setHours(0, 0, 0, 0);
  fimDate.setHours(0, 0, 0, 0);

  if (hoje < inicioDate) return "agendado";
  if (hoje > fimDate) return "finalizado";
  return "ferias";
}

// Tabela de items.
const ItemContainer = document.querySelector(".table .func");

// Recarregamento dos items.
const refreshItemsUsingAPI = async () => {
  try {
    const response = await fetch(`${API_URL}/items`);
    const items = await response.json();

    ItemContainer.innerHTML = "";

    for (const item of items) {
      const tableItemContainer = document.createElement("div");
      tableItemContainer.classList.add("Item", "gridRow");

      const funcName = createTextDiv(item.funcName);
      funcName.classList.add("textName");
      const setor = createTextDiv(item.setor);
      const matricula = createTextDiv(item.matricula);
      const inicio = createTextDiv(item.inicio);
      const fim = createTextDiv(item.fim);
      const inicioValue = item.inicio;
      const fimValue = item.fim;

      const status = document.createElement("div");
      status.classList.add(calcularStatus(inicioValue, fimValue));

      if (status.className === "semAgendamento") {
        status.textContent = "Sem agendamento";
      } else if (status.className === "agendado") {
        status.textContent = "Agendado";
      } else if (status.className === "finalizado") {
        status.textContent = "Férias finalizadas";
      } else {
        status.textContent = "Férias";
      }

      const btnEditar = document.createElement("i");
      btnEditar.classList.add("fas", "fa-edit", "abrirEditar");

      btnEditar.addEventListener("click", () => {
        fetch("editar.html")
          .then((response) => response.text())
          .then((html) => {
            const container = document.getElementById("telaEditar");
            container.innerHTML = html;

            if (!document.querySelector('link[href="styleForm.css"]')) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = "styleForm.css";
              document.head.appendChild(link);
            }

            inicializarCadastro("telaEditar");
            preencherFormulario(item);
            toggleTela("telaEditar", true);
          })
          .catch((err) => console.error("Erro ao carregar editar.html:", err));
      });

      tableItemContainer.appendChild(funcName);
      tableItemContainer.appendChild(setor);
      tableItemContainer.appendChild(matricula);
      tableItemContainer.appendChild(inicio);
      tableItemContainer.appendChild(fim);
      tableItemContainer.appendChild(status);
      tableItemContainer.appendChild(btnEditar);

      ItemContainer.appendChild(tableItemContainer);
    }
  } catch (error) {
    console.error("Erro ao buscar itens do servidor:", error);
  }
};

// Inicializa a aplicação após o carregamento do DOM.
document.addEventListener("DOMContentLoaded", () => {
  refreshItemsUsingAPI();

  // Ativar o botão para abrir o cadastro ao clicar.
  document.querySelectorAll(".abrirCadastro").forEach((btn) => {
    btn.addEventListener("click", () => {
      carregarTela(".abrirCadastro", "telaCadastro", "cadastrar.html");
    });
  });
});

// Função para criar as informações do funcionário no item.
function createTextDiv(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div;
}

function inicializarCadastro(telaId) {
  const tela = document.getElementById(telaId);
  const form = tela.querySelector("#form");
  const funcName = tela.querySelector("#funcName");
  const setor = tela.querySelector("#setor");
  const matricula = tela.querySelector("#matricula");
  const inicio = tela.querySelector("#inicio");
  const fim = tela.querySelector("#fim");
  const inicioContainer = tela.querySelector("#inicio-container");
  const fimContainer = tela.querySelector("#fim-container");
  const checkbox = tela.querySelector("#checkbox");
  const days = tela.querySelector("#days");
  const rest = tela.querySelector("#rest");
  const total = tela.querySelector("#total");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Clone e substitui o checkbox para remover event listeners antigos.
  const checkboxState = checkbox.cloneNode(true);
  checkbox.parentNode.replaceChild(checkboxState, checkbox);

  // Modificar os inputs de inicio e fim através da checkbox.
  checkboxState.addEventListener("change", () => {
    if (checkboxState.checked) {
      inicioContainer.classList.add("invisivel");
      fimContainer.classList.add("invisivel");
      days.style.display = "none";
    } else {
      inicioContainer.classList.remove("invisivel");
      fimContainer.classList.remove("invisivel");
    }

    /*
    Os campos dos dias restantes e total só irão ser visíveis caso o form 
    seja de edição e caso o status do funcionário seja "férias"
    */
    if (
      telaId === "telaEditar" &&
      !checkboxState.checked &&
      inicio.value &&
      fim.value &&
      calcularStatus(inicio.value, fim.value) === "ferias"
    ) {
      days.style.display = "flex";
      const inicioDate = new Date(inicio.value);
      const fimDate = new Date(fim.value);

      const umDia = 24 * 60 * 60 * 1000;
      const diasIntervalo = Math.round((fimDate - inicioDate) / umDia) + 1;
      const diasRestantes = Math.max(0, Math.round((fimDate - hoje) / umDia));

      total.textContent = `Total de dias: ${diasIntervalo}`;
      rest.textContent = `Dias restantes: ${diasRestantes}`;
    }
  });

  // Dispara o evento para aplicar o estado inicial correto.
  checkboxState.dispatchEvent(new Event("change"));

  // Validação dos inputs.
  async function checkInputs(isAtualizacao = false) {
    const funcNameValue = funcName.value.trim();
    const matriculaValue = matricula.value.trim();
    const setorValue = setor.value.trim();
    const inicioValue = inicio.value.trim();
    const fimValue = fim.value.trim();
    const nomeRegex = /^[A-Za-zÀ-ÿ\s]+$/;

    let isValid = true;

    let items = [];
    try {
      const response = await fetch(`${API_URL}/items`);
      items = await response.json();
    } catch (error) {
      console.error("Erro ao buscar itens do servidor:", error);
      alert("Erro ao validar dados. Tente novamente.");
      return false;
    }

    if (funcNameValue === "") {
      setErrorFor(funcName, "O nome de funcionário é obrigatório.");
      isValid = false;
    } else if (!nomeRegex.test(funcNameValue)) {
      setErrorFor(funcName, "O nome deve conter apenas letras.");
      isValid = false;
    } else {
      setSuccessFor(funcName);
    }

    if (matriculaValue === "") {
      setErrorFor(matricula, "A matrícula do funcionário é obrigatória.");
      isValid = false;
    } else if (matriculaValue.length !== 5) {
      setErrorFor(matricula, "A matrícula precisa ter 5 dígitos.");
      isValid = false;
    } else if (
      !isAtualizacao &&
      items.some((item) => item.matricula === matriculaValue)
    ) {
      setErrorFor(matricula, "Esta matrícula já está cadastrada.");
      isValid = false;
    } else if (isAtualizacao) {
      const matriculaOriginal =
        document.getElementById("matriculaOriginal")?.value;
      const duplicada = items.some(
        (item) =>
          item.matricula === matriculaValue &&
          item.matricula !== matriculaOriginal
      );
      if (duplicada) {
        setErrorFor(matricula, "Outra pessoa já está usando esta matrícula.");
        isValid = false;
      } else {
        setSuccessFor(matricula);
      }
    } else {
      setSuccessFor(matricula);
    }

    if (!setorValue) {
      setErrorFor(setor, "O setor de funcionário é obrigatório.");
      isValid = false;
    } else {
      setSuccessFor(setor);
    }

    if (!checkboxState.checked) {
      if (inicioValue === "") {
        setErrorFor(inicio, "Selecione a data de início das férias");
        isValid = false;
      } else {
        setSuccessFor(inicio);
      }

      const inicioDate = new Date(inicioValue);
      const fimDate = new Date(fimValue);
      const diffDays = (fimDate - inicioDate) / (1000 * 60 * 60 * 24);

      if (fimValue === "") {
        setErrorFor(fim, "Selecione a data do fim das férias");
        isValid = false;
      } else if (inicioValue >= fimValue) {
        setErrorFor(fim, "A data do fim das férias deve ser após o início");
        isValid = false;
      } else if (diffDays > 30) {
        setErrorFor(fim, "As férias não podem exceder 30 dias.");
        isValid = false;
      } else {
        setSuccessFor(fim);
      }
    }

    return isValid;
  }

  // Limpa os campos do formulário e redefine o estado da checkbox.
  function clearInputs() {
    funcName.value = "";
    setor.value = "";
    matricula.value = "";
    inicio.value = "";
    fim.value = "";
    checkboxState.checked = false;
    checkboxState.dispatchEvent(new Event("change"));
  }

  // Adicionar um item.
  const handleAddItem = () => {
    const tableItemContainer = document.createElement("div");
    tableItemContainer.classList.add("Item", "gridRow");

    const inicioValue = checkboxState.checked ? "-----" : inicio.value;
    const fimValue = checkboxState.checked ? "-----" : fim.value;

    const statusClasse = calcularStatus(inicioValue, fimValue);

    const item = {
      funcName: funcName.value,
      setor: setor.options[setor.selectedIndex].text,
      matricula: matricula.value,
      inicio: checkboxState.checked ? "-----" : inicio.value,
      fim: checkboxState.checked ? "-----" : fim.value,
      statusClass: statusClasse,
    };

    const funcNameDiv = createTextDiv(item.funcName.toUpperCase());
    funcNameDiv.classList.add("textName");
    const setorDiv = createTextDiv(item.setor.toUpperCase());
    const matriculaDiv = createTextDiv(item.matricula);
    const inicioDiv = createTextDiv(item.inicio);
    const fimDiv = createTextDiv(item.fim);

    const status = document.createElement("div");

    status.classList.add(calcularStatus(inicioValue, fimValue));
    if (status.className === "semAgendamento") {
      status.textContent = "Sem agendamento";
    } else if (status.className === "agendado") {
      status.textContent = "Agendado";
    } else if (status.className === "finalizado") {
      status.textContent = "Férias encerradas";
    } else {
      status.textContent = "Férias";
    }

    const btnEditar = document.createElement("i");
    btnEditar.classList.add("fas");
    btnEditar.classList.add("fa-edit");
    btnEditar.classList.add("abrirEditar");

    btnEditar.addEventListener("click", () => {
      fetch("editar.html")
        .then((response) => response.text())
        .then((html) => {
          const container = document.getElementById("telaEditar");
          container.innerHTML = html;

          if (!document.querySelector('link[href="styleForm.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "styleForm.css";
            document.head.appendChild(link);
          }

          inicializarCadastro("telaEditar");
          preencherFormulario(item);
          toggleTela("telaEditar", true);
        })
        .catch((err) => console.error("Erro ao carregar editar.html:", err));
    });

    tableItemContainer.appendChild(funcNameDiv);
    tableItemContainer.appendChild(setorDiv);
    tableItemContainer.appendChild(matriculaDiv);
    tableItemContainer.appendChild(inicioDiv);
    tableItemContainer.appendChild(fimDiv);
    tableItemContainer.appendChild(status);
    tableItemContainer.appendChild(btnEditar);

    const ItemContainer = document.querySelector(".table .func");
    ItemContainer.appendChild(tableItemContainer);

    clearInputs();
    salvarItemNoServidor(item);
    toggleTela(telaId, false);
  };

  // Botão para cadastrar.
  const addItemButton = tela.querySelector("#btnCadastrar");
  if (addItemButton) {
    addItemButton.addEventListener("click", async (e) => {
      e.preventDefault();

      if (await checkInputs()) {
        handleAddItem();
      }
    });
  }

  // Botão para cancelar.
  const btnCancelar = tela.querySelector("#btnCancelar");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      toggleTela(telaId, false);
    });
  }

  // Botão para excluir.
  const btnExcluir = tela.querySelector("#btnExcluir");
  if (btnExcluir) {
    btnExcluir.addEventListener("click", async (e) => {
      e.preventDefault();

      // Pega a matrícula original, não a que está visível.
      const matriculaOriginal = tela.querySelector("#matriculaOriginal")?.value;
      if (!matriculaOriginal) {
        alert("Matrícula não encontrada.");
        return;
      }

      const confirmacao = confirm("Tem certeza que deseja excluir este item?");
      if (!confirmacao) return;

      try {
        const response = await fetch(`${API_URL}/items/${matriculaOriginal}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          alert("Erro ao excluir o item.");
          return;
        }

        // Atualiza a lista com dados do servidor
        await refreshItemsUsingAPI();

        // Fecha a tela de edição
        toggleTela(telaId, false);
      } catch (error) {
        console.error("Erro ao excluir item:", error);
        alert("Erro na comunicação com o servidor.");
      }
    });
  }

  const btnAtualizar = tela.querySelector("#btnAtualizar");
  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!(await checkInputs(true))) return;

      const matriculaOriginal = tela.querySelector("#matriculaOriginal")?.value;
      if (!matriculaOriginal) {
        alert("Matrícula original não encontrada.");
        return;
      }

      const updatedItem = {
        funcName: funcName.value.toUpperCase(),
        setor: setor.options[setor.selectedIndex].text.toUpperCase(),
        matricula: matricula.value,
        inicio: checkboxState.checked ? "-----" : inicio.value,
        fim: checkboxState.checked ? "-----" : fim.value,
        statusClass: calcularStatus(
          checkboxState.checked ? "-----" : inicio.value,
          checkboxState.checked ? "-----" : fim.value
        ),
      };

      try {
        const response = await fetch(`${API_URL}/items/${matriculaOriginal}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItem),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Erro ao atualizar: ${errorData.error || response.statusText}`);
          return;
        }

        // Atualiza a lista direto do backend
        await refreshItemsUsingAPI();

        // Fecha a tela de edição
        toggleTela(telaId, false);
      } catch (error) {
        alert("Erro na comunicação com o servidor.");
        console.error(error);
      }
    });
  }
}

// Marca visualmente um campo de formulário como inválido.
function setErrorFor(input, message) {
  const formControl = input.parentElement;

  if (!formControl) {
    console.error("Elemento 'formControl' não encontrado");
    return;
  }

  const small = formControl.querySelector("small");

  if (!small) {
    console.error("Elemento 'small' não encontrado");
    return;
  }

  small.innerText = message;
  formControl.className = "form-control error";
}

// Marca visualmente um campo de formulário como válido.
function setSuccessFor(input) {
  const formControl = input.parentElement;
  formControl.className = "form-control success";
}

// Atualiza o localStorage com os dados dos funcionários exibidos na tabela.
const salvarItemNoServidor = async (item) => {
  try {
    const response = await fetch(`${API_URL}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar item.");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao enviar item:", error);
  }
};

// Preenche os campos dos inputs no formulário de edição.
function preencherFormulario(item) {
  const telaEditar = document.getElementById("telaEditar");
  if (!telaEditar) return;

  telaEditar.querySelector("#funcName").value = item.funcName;
  telaEditar.querySelector("#matricula").value = item.matricula;
  const selectSetor = telaEditar.querySelector("#setor");

  // Verifica se o valor salvo corresponde ao texto visível.
  for (const option of selectSetor.options) {
    if (option.text.trim().toUpperCase() === item.setor.trim().toUpperCase()) {
      selectSetor.value = option.value;
      break;
    }
  }
  telaEditar.querySelector("#inicio").value =
    item.inicio === "-----" ? "" : item.inicio;
  telaEditar.querySelector("#fim").value = item.fim === "-----" ? "" : item.fim;

  const checkbox = telaEditar.querySelector("#checkbox");
  if (checkbox) {
    checkbox.checked = item.inicio === "-----" && item.fim === "-----";
    checkbox.dispatchEvent(new Event("change"));
  }

  // Armazena a matrícula original para excluir ou atualizar.
  let inputOriginal = telaEditar.querySelector("#matriculaOriginal");
  if (!inputOriginal) {
    inputOriginal = document.createElement("input");
    inputOriginal.type = "hidden";
    inputOriginal.id = "matriculaOriginal";
    telaEditar.querySelector("form").appendChild(inputOriginal);
  }
  inputOriginal.value = item.matricula;
}
