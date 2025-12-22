const processCSV = async () => {
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    
    reader.onload = async ({ target }) => {
      const csv = target?.result;
      if (typeof csv !== 'string') return;

      const lines = csv.split(/\r?\n/); // Divide por quebra de linha (Windows ou Linux)
      const leads = [];
      
      // Itera pelas linhas (pula a primeira se for cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Regex para separar por vírgula, mas ignorar vírgulas dentro de aspas
        // Ex: "João","joao@email.com","11999","Empresa, Ltda"
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        
        // Fallback simples se o regex falhar em casos muito simples
        const cols = matches 
          ? matches.map(col => col.replace(/^"|"$/g, '').trim()) // Remove aspas extras
          : line.split(','); 

        if (cols.length >= 1) {
          // Garante que pegamos os dados mesmo se faltar alguma coluna no final
          leads.push({
            name: cols[0]?.trim() || 'Desconhecido',
            email: cols[1]?.trim() || undefined,
            phone: cols[2]?.trim() || undefined,
            company_name: cols[3]?.trim() || undefined,
            source: 'Importação CSV'
          });
        }
      }

      if (leads.length === 0) {
        alert('Nenhum lead válido encontrado.');
        setLoading(false);
        return;
      }

      try {
        const res = await leadsService.importCSV(leads);
        alert(`Sucesso! ${res.count} leads importados.`);
        onSuccess();
        onClose();
        setFile(null);
      } catch (error) {
        console.error(error);
        alert('Erro ao importar. Verifique o console.');
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsText(file);
  };