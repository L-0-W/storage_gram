(function () {
  function code(file, src) {
    const escaped = src.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<figure class="code"><figcaption><span>${file}</span><button type="button" class="copy">Copiar</button></figcaption><pre class="rust"><code>${escaped}</code></pre></figure>`;
  }
  function note(kind, title, html) {
    return `<aside class="callout ${kind}"><span class="bar"></span><div><strong>${title}</strong><div>${html}</div></div></aside>`;
  }

  const functions = [
    {
      id: "fn-main",
      name: "main",
      group: "main",
      kind: "fn",
      pills: ["async", "fn"],
      where: "StoreGram/src/main.rs · 32–73",
      sig: "#[tokio::main] async fn main()",
      calls: [
        { id: "fn-app-new", name: "TelegramAPP::new" },
        { id: "fn-connect", name: "Store::connect" },
        { id: "fn-create-db", name: "Store::create_db" },
        { id: "fn-create-table", name: "Store::create_table" },
        { id: "fn-show", name: "Store::show_db_tables" },
        { id: "fn-insert", name: "Store::insert" },
        { id: "fn-get", name: "Store::get" },
      ],
      summary: "Sobe a conta, garante o banco UserDB e as três tabelas, imprime o que está na memória e fica num loop lendo o teclado.",
      body: `<p>É o único ponto de entrada. O crate <code>StoreGram</code> não tem <code>lib.rs</code>, então hoje a “biblioteca” só existe como módulos deste binário. A macro <code>StoreTable</code> entra no escopo pelo <code>use store_gram::macros::*</code>, e é esse glob que também traz <code>Arc</code>, <code>fmt</code> e a trait. Sem esse import, o <code>#[derive(StoreTable)]</code> não compila nas structs daqui.</p>
      <p>Depois do connect, <code>create_db("UserDB")</code> segura o mutex só durante a criação. As três <code>create_table</code> recebem um clone do <code>Arc</code> e cada uma espera a task terminar. O <code>expect</code> só dispara se a task não conseguir dar join. Um <code>ResultErrs::TableAlreadyExist</code> ainda é <code>Some</code>, então o programa segue.</p>
      <p>O loop não tem comando de saída. Cada linha passa por três <code>if</code> separados (<code>user</code>, <code>games</code>, <code>get</code>) e depois dorme 5 segundos com <code>std::thread::sleep</code>, o que bloqueia a thread do Tokio.</p>`,
    },
    {
      id: "ty-user",
      name: "User, Images, Games",
      group: "main",
      kind: "type",
      pills: ["type"],
      where: "StoreGram/src/main.rs · 10–29",
      sig: "#[derive(StoreTable)] struct User { nome: String, idade: u8 }",
      calls: [{ id: "fn-derive", name: "derive_store_table" }],
      summary: "Três tabelas de demonstração. O derive gera o nome, a lista de campos e o texto que vira mensagem.",
      body: `<p><code>User</code> tem <code>nome</code> e <code>idade</code>. <code>Images</code> tem <code>path</code> e <code>size</code>. <code>Games</code> tem <code>path</code> e <code>price</code>. Os números são <code>u8</code>: serve para a demo, e não cabe o tamanho de um arquivo de verdade.</p>
      <p>As três são criadas no Telegram. Só <code>User</code> e <code>Games</code> têm ramo no loop. <code>Images</code> fica com tópico vazio. Os valores inseridos estão fixos no fonte: Luiz / 10, e <code>./re9</code> / 90.</p>`,
    },
    {
      id: "fn-app-new",
      name: "TelegramAPP::new",
      group: "types",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/types.rs · 11–18",
      sig: "pub fn new(api_hash: &str, api_id: i32, phone: &str) -> Self",
      calls: [],
      summary: "Copia hash, id e telefone para a struct que o login vai usar.",
      body: `<p>Não fala com a rede. Só guarda o que o <code>grammers</code> pede para pedir o código de login: o <code>api_hash</code> vai em <code>request_login_code</code>, o <code>api_id</code> vai no <code>SenderPool</code>, o telefone identifica a conta.</p>
      ${note("danger", "Segredo no fonte", "main chama este construtor com hash, id e telefone escritos no arquivo. Esta documentação não repete esses valores. Eles também já passaram por código antigo que foi apagado, então continuam no histórico do git. O próximo passo seguro é tirá-los do fonte e gerar credencial nova em my.telegram.org.")}`,
    },
    {
      id: "ty-app",
      name: "TelegramAPP",
      group: "types",
      kind: "type",
      pills: ["type"],
      where: "StoreGram/src/types.rs · 5–9",
      sig: "pub struct TelegramAPP { api_hash: String, api_id: i32, phone: String }",
      calls: [],
      summary: "Credencial da aplicação Telegram, não a sessão do usuário.",
      body: `<p>A sessão autenticada mora em <code>session.gram</code>. Esta struct é só o pedido de login. Os três campos são públicos.</p>`,
    },
    {
      id: "ty-channel",
      name: "Channel",
      group: "types",
      kind: "enum",
      pills: ["enum"],
      where: "StoreGram/src/types.rs · 24–27",
      sig: "pub enum Channel { Channel(tl::types::Channel), IsNotSet }",
      calls: [],
      summary: "O banco aberto agora, ou a marca de que create_db ainda não rodou.",
      body: `<p>Começa em <code>IsNotSet</code> pelo <code>Default</code> de <code>Database</code>. <code>create_db</code> troca para a variante com o canal completo devolvido pela API, inclusive <code>id</code> e <code>access_hash</code>. Quase toda operação depois disso faz <code>match</code> e desiste, ou entra em panic, se ainda estiver <code>IsNotSet</code>.</p>`,
    },
    {
      id: "ty-database",
      name: "Database",
      group: "types",
      kind: "type",
      pills: ["type"],
      where: "StoreGram/src/types.rs · 29–54",
      sig: "pub struct Database { channel, tables_fields, tables_peer }",
      calls: [
        { id: "fn-set-channel", name: "Database::set_channel" },
        { id: "fn-set-fields", name: "Database::set_table_fields" },
        { id: "fn-db-default", name: "Database::default" },
      ],
      summary: "O catálogo em memória. Não é o dado: é o ponteiro para o canal e para os tópicos.",
      body: `<p><code>tables_fields</code> é um <code>HashMap</code> de nome da struct para a lista <code>(campo, tipo)</code>. <code>tables_peer</code> é outro mapa, do mesmo nome para o id da mensagem que criou o tópico (<code>i32</code>). Os dois precisam andar juntos. Hoje <code>table_exist</code> considera a tabela pronta só de olhar <code>tables_fields</code>, mesmo se o peer ainda não foi gravado.</p>
      <p><code>Database::new</code> existe e está marcado com <code>allow(unused)</code>. Ninguém chama. O caminho real é <code>Default</code> e os dois setters.</p>`,
    },
    {
      id: "fn-set-channel",
      name: "Database::set_channel",
      group: "types",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/types.rs · 41–43",
      sig: "pub fn set_channel(&mut self, channel: tl::types::Channel)",
      calls: [],
      summary: "Envolve o canal na variante Channel::Channel e guarda em database.channel.",
      body: `<p>Chamado quando <code>CreateChannel</code> devolve um chat do tipo canal. O caminho que reabre um banco já salvo não usa este setter: ele escreve <code>self.database.channel = Channel::Channel(c)</code> direto.</p>`,
    },
    {
      id: "fn-set-fields",
      name: "Database::set_table_fields",
      group: "types",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/types.rs · 45–47",
      sig: "pub fn set_table_fields(&mut self, (nome, campos))",
      calls: [],
      summary: "Insere o schema da tabela no mapa, antes mesmo de o tópico existir no Telegram.",
      body: `<p>A chave é o nome da struct em <code>Arc&lt;str&gt;</code>. O valor é o vetor que a macro produziu. <code>telegram_create_table</code> chama isso cedo. Se o RPC seguinte falhar, a memória já diz que a tabela existe.</p>`,
    },
    {
      id: "fn-db-default",
      name: "Database::default",
      group: "types",
      kind: "fn",
      pills: ["fn"],
      where: "StoreGram/src/types.rs · 50–54",
      sig: "fn default() -> Self",
      calls: [],
      summary: "Canal ausente e os dois mapas vazios.",
      body: `<p><code>connect</code> e <code>connect_from_session</code> sempre começam daqui. Nada é lido do disco dentro do <code>Default</code>. O disco só entra em <code>create_db</code> e <code>table_exist</code>.</p>`,
    },
    {
      id: "tr-store",
      name: "StoreTableTrait",
      group: "types",
      kind: "trait",
      pills: ["trait"],
      where: "StoreGram/src/types.rs · 56–59",
      sig: "fn get_filds() -> Vec<(Arc<str>, Arc<str>)>; fn get_struct() -> &'static str",
      calls: [],
      summary: "O contrato que a macro implementa. O nome do método de campos está com a grafia get_filds.",
      body: `<p>Não há método de ler ou gravar valor. A trait só descreve a forma da struct em tempo de execução: o nome e os pares campo/tipo, ambos como texto. O valor da linha viaja por outro caminho, o <code>Display</code> que a mesma macro também gera.</p>
      <p>Quem limita o genérico usa <code>T: StoreTableTrait</code>. <code>insert</code> pede ainda <code>T: Display</code>. Manter o typo <code>filds</code> importa: mudar o nome aqui quebra a macro e todos os call sites.</p>`,
    },
    {
      id: "en-err",
      name: "ResultErrs",
      group: "types",
      kind: "enum",
      pills: ["enum"],
      where: "StoreGram/src/types.rs · 61–69",
      sig: "enum ResultErrs { ErrInicializeDataBase, ClientNotLogged, ErrInvoke, TableAlreadyExist, TablePeerNotFound, Ok }",
      calls: [],
      summary: "O status de create_table, inclusive o caso de sucesso, que se chama Ok.",
      body: `<p>Não implementa <code>Error</code>. A função devolve <code>Option&lt;ResultErrs&gt;</code>: <code>None</code> é falha da task, <code>Some(Ok)</code> é sucesso, e as outras variantes também são <code>Some</code>. Por isso o <code>expect</code> do <code>main</code> não trata esses casos como erro.</p>
      <ul>
        <li><code>ErrInicializeDataBase</code> — <code>database.channel</code> ainda é <code>IsNotSet</code>.</li>
        <li><code>ClientNotLogged</code> — <code>is_authorized</code> devolveu falso.</li>
        <li><code>ErrInvoke</code> — o RPC <code>CreateForumTopic</code> falhou. A variante está marcada como não usada no match de fora, mas é construída.</li>
        <li><code>TableAlreadyExist</code> — a tabela já estava na memória ou no <code>schema.table</code>.</li>
        <li><code>TablePeerNotFound</code> — a mensagem de serviço do tópico veio sem <code>from_id</code>, então o id não foi salvo.</li>
      </ul>`,
    },
    {
      id: "ty-file",
      name: "File",
      group: "manager",
      kind: "type",
      pills: ["type"],
      where: "StoreGram/src/manager.rs · 2",
      sig: "pub struct File();",
      calls: [],
      summary: "Struct vazia usada como namespace. Não guarda estado.",
      body: `<p>Todos os métodos são associados. O estado real são os arquivos <code>schema.base</code> e <code>schema.table</code> no diretório de onde o processo foi iniciado.</p>`,
    },
    {
      id: "en-search",
      name: "SearchResult",
      group: "manager",
      kind: "enum",
      pills: ["enum"],
      where: "StoreGram/src/manager.rs · 4–9",
      sig: "pub enum SearchResult<T> { FileNotExist, FileEmpty, NoItemFound, Ok(T) }",
      calls: [],
      summary: "O resultado de procurar um nome nos arquivos de índice.",
      body: `<p><code>search_base</code> devolve <code>Ok((channel_id, access_hash))</code>, os dois como <code>i64</code>. <code>search_table</code> devolve <code>Ok((schema, peer))</code>, os dois como <code>String</code>. <code>FileEmpty</code> só é construído em <code>search_table</code>, e mesmo assim quando a leitura de uma linha falha, não quando o arquivo está vazio. Um arquivo vazio só esgota o loop e cai em <code>NoItemFound</code>.</p>`,
    },
    {
      id: "fn-file-create",
      name: "File::create",
      group: "manager",
      kind: "fn",
      pills: ["priv", "fn"],
      where: "StoreGram/src/manager.rs · 12–20",
      sig: "fn create(name: &str)",
      calls: [],
      summary: "Cria o arquivo vazio e descarta o handle. Se falhar, imprime e volta.",
      body: `<p>Privada. <code>insert_base</code> e <code>insert_table</code> chamam quando <code>fs::exists</code> diz que o índice ainda não está lá. Não escreve cabeçalho. A primeira linha útil vem no <code>writeln!</code> seguinte.</p>`,
    },
    {
      id: "fn-insert-table",
      name: "File::insert_table",
      group: "manager",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/manager.rs · 23–65",
      sig: "pub fn insert_table(table_name: String, schema: String, peer: String) -> bool",
      calls: [{ id: "fn-file-create", name: "File::create" }],
      summary: "Acrescenta uma linha nome|schema|id_do_tópico em schema.table.",
      body: `<p>Abre com append. Não procura duplicata: chamar duas vezes grava duas linhas, e <code>search_table</code> fica com a primeira. O retorno <code>false</code> cobre falha de exists, de open, de write e de flush. O caller em <code>telegram_create_table</code> ignora esse bool.</p>
      <p>A linha que o código produz para User é <code>User|nome: String,idade: u8|4821</code>, com espaço depois dos dois-pontos e sem espaço depois da vírgula. O terceiro campo é <code>service.id</code>, o id da mensagem de criação do tópico.</p>`,
    },
    {
      id: "fn-insert-base",
      name: "File::insert_base",
      group: "manager",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/manager.rs · 67–109",
      sig: "pub fn insert_base(base_name: String, peer: String, acess_hash: String) -> bool",
      calls: [{ id: "fn-file-create", name: "File::create" }],
      summary: "Acrescenta uma linha nome|channel_id|access_hash em schema.base.",
      body: `<p>Mesmo desenho de <code>insert_table</code>, outro arquivo. Aqui <code>peer</code> não é tópico: é o <code>id</code> do canal. O hash é o <code>access_hash</code> do canal, convertido com <code>to_string</code>. O parâmetro está grafado <code>acess_hash</code>.</p>
      <p>Esse par é o que permite montar <code>InputChannel</code> e <code>InputPeerChannel</code> na próxima execução, sem varrer os diálogos da conta.</p>`,
    },
    {
      id: "fn-search-base",
      name: "File::search_base",
      group: "manager",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/manager.rs · 111–140",
      sig: "pub fn search_base(base_name: String) -> SearchResult<(i64, i64)>",
      calls: [],
      summary: "Lê schema.base linha a linha até achar o nome do banco.",
      body: `<p>Arquivo ausente vira <code>FileNotExist</code>. Cada linha é partida em <code>|</code> três vezes, e o código pega os índices 0, 1 e 2 sem testar o comprimento. Uma linha curta entra em panic. O nome comparado é a coluna 0, sem trim. Achou: faz <code>parse::<i64></code> nas duas colunas seguintes, também com <code>unwrap</code>.</p>
      <p>Varre o arquivo inteiro só até o primeiro match. Não há índice.</p>`,
    },
    {
      id: "fn-search-table",
      name: "File::search_table",
      group: "manager",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/manager.rs · 142–170",
      sig: "pub fn search_table(table_name: String) -> SearchResult<(String, String)>",
      calls: [],
      summary: "Lê schema.table e devolve o texto do schema mais o id do tópico.",
      body: `<p>Mesmo risco de índice que <code>search_base</code>. A diferença é o tratamento de erro de leitura: se <code>lines()</code> falha numa linha, a função devolve <code>FileEmpty</code> na hora e abandona o resto do arquivo. O nome do variante não descreve o que aconteceu.</p>
      <p>O schema volta como a string crua da coluna do meio. Quem interpreta os campos é <code>table_exist</code>, não esta função.</p>`,
    },
    {
      id: "ty-store",
      name: "Store",
      group: "store",
      kind: "type",
      pills: ["type"],
      where: "StoreGram/src/store_gram.rs · 15–22",
      sig: "pub struct Store { session_path, user, client, database }",
      calls: [],
      summary: "A sessão, o usuário logado, o cliente MTProto e o catálogo em memória, num objeto só.",
      body: `<p><code>connect</code> entrega isso dentro de <code>Arc&lt;tokio::sync::Mutex&lt;Store&gt;&gt;</code>. <code>session_path</code> e <code>user</code> estão marcados como não lidos. O <code>client</code> é o único jeito de falar com o Telegram. O <code>database</code> é o único jeito de saber qual canal e quais tópicos usar.</p>
      <p>O mutex trava os dois juntos. <code>insert</code> segura o lock durante o <code>send_message</code>. Um envio de arquivo grande, no futuro, travaria o catálogo inteiro pelo mesmo motivo.</p>`,
    },
    {
      id: "fn-connect",
      name: "Store::connect",
      group: "store",
      kind: "fn",
      pills: ["async", "pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 27–71",
      sig: "pub async fn connect(app: TelegramAPP) -> Result<Arc<Mutex<Store>>>",
      calls: [
        { id: "fn-db-default", name: "Database::default" },
        { name: "SqliteSession::open" },
        { name: "SenderPool::new" },
        { name: "Client::new" },
        { name: "Client::is_authorized" },
        { name: "Client::request_login_code" },
        { name: "Client::sign_in" },
        { name: "Client::get_me" },
      ],
      summary: "Abre session.gram, sobe o loop de rede do grammers e devolve o Store já autenticado.",
      body: `<p>A sessão SQLite é sempre <code>./session.gram</code>. O <code>SenderPool</code> separa, no grammers 0.9, o runner de rede do handle usado pelo <code>Client</code>. O campo <code>updates</code> é descartado: este programa não escuta evento que chega. Ele só faz pedido e resposta.</p>
      <p>O runner vai para uma task com <code>tokio::spawn</code> e fica vivo até o processo morrer. Sem essa task, o <code>invoke</code> não tem quem mande o pacote.</p>
      <p>Se <code>is_authorized</code> é falso, pede o código SMS/Telegram, lê uma linha do stdin com o texto “Digite o codigo que chegou” e chama <code>sign_in</code>. Qualquer erro no pedido do código vira <code>panic!("ERRO")</code>. Se já está autorizado, <code>get_me</code> preenche <code>user</code>. Os dois ramos constroem o mesmo <code>Store</code> com <code>Database::default</code> e o embrulham no mutex.</p>
      ${note("info", "O que esta função ainda não faz", "Ela não abre schema.base nem schema.table. Conectar não restaura o banco. Quem restaura é create_db, e quem restaura tabela é table_exist, chamado por create_table e por insert.")}`,
    },
    {
      id: "fn-connect-session",
      name: "Store::connect_from_session",
      group: "store",
      kind: "fn",
      pills: ["async", "pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 73–111",
      sig: "pub async fn connect_from_session(app: TelegramAPP, sesion_path: &str) -> Result<Store>",
      calls: [
        { id: "fn-db-default", name: "Database::default" },
        { name: "SqliteSession::open" },
      ],
      summary: "Irmã de connect que aceita outro caminho de sessão. Está marcada como não usada e ninguém chama.",
      body: `<p>O parâmetro está grafado <code>sesion_path</code>. A sessão abre nesse caminho. No ramo em que precisa logar, o <code>session_path</code> guardado na struct volta a ser a string fixa <code>./session.gram</code>, não o caminho pedido. No ramo já autorizado, guarda o caminho certo.</p>
      <p>O retorno é <code>Store</code> direto, sem <code>Arc&lt;Mutex&gt;</code>. <code>create_table</code> não aceitaria esse valor sem uma adaptação. Por isso o <code>main</code> usa <code>connect</code>.</p>`,
    },
    {
      id: "fn-create-db",
      name: "Store::create_db",
      group: "store",
      kind: "fn",
      pills: ["async", "pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 113–192",
      sig: "pub async fn create_db(&mut self, name: &str) -> Result<(), InvocationError>",
      calls: [
        { id: "fn-search-base", name: "File::search_base" },
        { id: "fn-set-channel", name: "Database::set_channel" },
        { id: "fn-insert-base", name: "File::insert_base" },
        { name: "channels.GetChannels" },
        { name: "channels.CreateChannel" },
      ],
      summary: "Reabre o canal cujo nome está em schema.base, ou cria um canal fórum novo e grava o índice.",
      body: `<p>Primeiro <code>search_base</code>. Se achar, monta <code>InputChannel { channel_id, access_hash }</code>, chama <code>channels.GetChannels</code> e, no chat cujo <code>id</code> bate, guarda o canal na memória. Aí retorna. Não mexe em tabela.</p>
      <p>Se a busca não for <code>Ok</code> — arquivo ausente, nome novo, ou qualquer outro variante — cai no <code>CreateChannel</code>. Os flags são <code>broadcast: false</code>, <code>megagroup: false</code>, <code>forum: true</code>, título igual ao <code>name</code> e about <code>"database"</code>. O experimento antigo, já apagado do fonte, criava o fórum com <code>megagroup: true</code>. Fórum no Telegram é supergrupo. Se <code>CreateChannel</code> falhar ao retomar, esse flag é o primeiro lugar para olhar.</p>
      <p>No <code>Updates::Updates</code>, cada chat <code>Channel</code> entra em <code>set_channel</code> e em <code>insert_base(nome, id, access_hash)</code>. Outras formas de <code>Updates</code> só dão print. Se o cliente não está autorizado, a função não cria nada e ainda assim devolve <code>Ok(())</code>.</p>`,
    },
    {
      id: "fn-table-exist",
      name: "Store::table_exist",
      group: "store",
      kind: "fn",
      pills: ["priv", "fn"],
      where: "StoreGram/src/store_gram.rs · 194–224",
      sig: "fn table_exist<T: StoreTableTrait>(&mut self) -> bool",
      calls: [
        { id: "fn-search-table", name: "File::search_table" },
        { id: "tr-store", name: "StoreTableTrait" },
      ],
      summary: "Diz se a tabela está na memória. Se não estiver, tenta hidratar a memória a partir de schema.table.",
      body: `<p>Pega o nome com <code>T::get_struct()</code>. Se <code>tables_fields</code> já tem a chave, devolve true na hora, sem olhar <code>tables_peer</code> e sem olhar o disco.</p>
      <p>Senão abre o índice. No <code>Ok</code>, parte o schema por vírgula e cada pedaço por <code>split_once(":")</code>. O lado direito guarda o espaço. Exemplo: o tipo de <code>nome</code> volta como <code>" String"</code>, não <code>"String"</code>. Os dois mapas são preenchidos e a função devolve true. Qualquer outra busca devolve false.</p>
      <p>Esse true tem dois sentidos diferentes para quem chama. <code>create_table</code> entende “já existe, não crie”. <code>insert</code> entende “pode mandar a mensagem”. Na segunda execução, a mesma função carrega o índice e ao mesmo tempo impede criar o tópico de novo.</p>`,
    },
    {
      id: "fn-get",
      name: "Store::get",
      group: "store",
      kind: "fn",
      pills: ["async", "pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 226–272",
      sig: "pub async fn get(&self)",
      calls: [{ name: "messages.GetForumTopicsById" }],
      summary: "Lista os tópicos conhecidos na memória e imprime o título junto com a mensagem de cabeçalho do tópico.",
      body: `<p>Lê <code>channel.id</code> e <code>access_hash</code>. Se o canal não está setado, o <code>unwrap</code> estoura. Junta todos os valores de <code>tables_peer</code> — os ids de tópico, não os nomes — e chama <code>messages.GetForumTopicsById</code>.</p>
      <p>A resposta traz <code>topics</code> e <code>messages</code>. O código assume que o índice <code>i</code> dos dois vetores é o mesmo tópico. Para cada um, imprime o título e o texto. Se a mensagem não for a variante <code>Message::Message</code>, usa a string <code>"Não tem"</code>. A mensagem que criou o tópico é de serviço, então o caminho normal desse print é justamente <code>"Não tem"</code>.</p>
      ${note("warn", "Isto não lê as linhas", "O insert manda uma mensagem nova respondendo o tópico. get não chama getHistory, não filtra por reply_to e não guarda id de mensagem de linha. O texto nome: Luiz / idade: 10 não volta por aqui. Foi a última função acrescentada no commit salvando, e ainda é uma leitura do fórum, não da tabela.")}
      <p>O ramo <code>"Não tem".to_string()</code> empresta um temporário. Vale rodar <code>cargo check</code> ao reabrir o projeto: se o compilador não estender o tempo de vida até o <code>println!</code>, esse braço não compila.</p>`,
    },
    {
      id: "fn-create-table",
      name: "Store::create_table",
      group: "store",
      kind: "fn",
      pills: ["async", "pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 274–282",
      sig: "pub async fn create_table<G: StoreTableTrait>(this: Arc<Mutex<Self>>) -> Option<ResultErrs>",
      calls: [{ id: "fn-tg-create-table", name: "Store::telegram_create_table" }],
      summary: "Spawna uma task, trava o mutex dentro dela e espera o resultado.",
      body: `<p>O <code>main</code> não segura o lock quando chama. A task clona o uso do <code>Arc</code>, dá <code>lock</code> e chama <code>telegram_create_table</code>. Em seguida <code>create_table</code> dá <code>await</code> nessa task. Do ponto de vista de quem chama, é síncrono: a próxima tabela só começa quando esta terminar.</p>
      <p><code>handler.await.ok()?</code> transforma erro de join em <code>None</code>. O trabalho interno devolve sempre <code>Some</code>.</p>`,
    },
    {
      id: "fn-tg-create-table",
      name: "Store::telegram_create_table",
      group: "store",
      kind: "fn",
      pills: ["async", "priv", "fn"],
      where: "StoreGram/src/store_gram.rs · 284–373",
      sig: "async fn telegram_create_table<F: StoreTableTrait>(&mut self) -> Option<ResultErrs>",
      calls: [
        { id: "fn-table-exist", name: "Store::table_exist" },
        { id: "fn-set-fields", name: "Database::set_table_fields" },
        { id: "tr-store", name: "StoreTableTrait" },
        { id: "fn-insert-table", name: "File::insert_table" },
        { name: "messages.CreateForumTopic" },
      ],
      summary: "Cria um tópico com o nome da struct, guarda o id da mensagem de serviço e escreve schema.table.",
      body: `<p>Se <code>table_exist</code> devolve true, imprime <code>TABLE JA EXISTE</code> e devolve <code>TableAlreadyExist</code>. Na segunda execução esse é o caminho feliz de carga: o índice entra na memória e o tópico não é duplicado.</p>
      <p>Se segue, copia os campos da trait para <code>tables_fields</code> antes do RPC. Exige cliente autorizado e canal já setado. Monta <code>InputPeerChannel</code> e <code>messages.CreateForumTopic</code> com o título igual a <code>get_struct()</code>, <code>random_id</code> aleatório de 64 bits, sem ícone e sem <code>send_as</code>.</p>
      <p>Na resposta, procura <code>Update::NewChannelMessage</code> → mensagem <code>Service</code> → ação <code>TopicCreate</code>. O id que importa é <code>service.id</code>, não um campo dentro da ação. Esse número é a identidade do tópico no Telegram. Ele vai para <code>tables_peer</code> e para a terceira coluna de <code>schema.table</code>. O schema gravado é <code>campo: tipo</code> juntado por vírgula.</p>
      <p>Se <code>from_id</code> vier vazio, devolve <code>TablePeerNotFound</code> mesmo com o tópico já criado do lado de lá. O tópico fica órfão: não há peer local para o insert responder.</p>`,
    },
    {
      id: "fn-show",
      name: "Store::show_db_tables",
      group: "store",
      kind: "fn",
      pills: ["pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 376–379",
      sig: "pub fn show_db_tables(&self) -> Values<'_, Arc<str>, Vec<(Arc<str>, Arc<str>)>>",
      calls: [],
      summary: "Devolve o iterador dos valores do mapa de campos, não os nomes das tabelas.",
      body: `<p>O <code>main</code> imprime cada item com <code>{:?}</code>. O que aparece é o vetor de pares, por exemplo os campos de User, sem a chave <code>"User"</code>. O iterador empresta o <code>Store</code>, então o <code>lock</code> do <code>main</code> continua seguro durante o <code>for</code> e só solta no fim do loop.</p>
      <p>Para listar nomes, o mapa certo é <code>tables_fields.keys()</code>, ou <code>iter()</code> se quiser nome e campos juntos. <code>tables_peer</code> nem é consultado aqui.</p>`,
    },
    {
      id: "fn-insert",
      name: "Store::insert",
      group: "store",
      kind: "fn",
      pills: ["async", "pub", "fn"],
      where: "StoreGram/src/store_gram.rs · 381–410",
      sig: "pub async fn insert<T: StoreTableTrait + Display>(&mut self, value_to_insert: T)",
      calls: [
        { id: "fn-table-exist", name: "Store::table_exist" },
        { id: "tr-store", name: "StoreTableTrait" },
        { name: "Client::send_message" },
      ],
      summary: "Formata a struct com Display e manda esse texto como mensagem dentro do tópico da tabela.",
      body: `<p>Se <code>table_exist</code> é falso, a função acaba em silêncio. Não há <code>else</code> e não há erro.</p>
      <p>Com a tabela presente, lê o id do tópico em <code>tables_peer</code> (<code>unwrap</code> se a chave não existir). Imprime o nome do primeiro campo — sobra de depuração — e imprime o <code>Display</code> do valor. A mensagem é <code>InputMessage::text(...).reply_to(Some(id_do_tópico))</code>. Responder a mensagem raiz do tópico é o jeito do Telegram de publicar dentro daquele tópico.</p>
      <p>O <code>send_message</code> usa o canal guardado em <code>database.channel</code>. Também tem <code>unwrap</code>. Não há id local da linha, não há update e não há delete. Cada insert acrescenta outra mensagem.</p>
      <p>O texto de <code>User { nome: \"Luiz\", idade: 10 }</code> fica assim, com quebra no fim de cada campo:</p>
      ${code("mensagem no tópico User", "nome: Luiz\nidade: 10\n")}`,
    },
    {
      id: "fn-derive",
      name: "derive_store_table",
      group: "macros",
      kind: "macro",
      pills: ["macro"],
      where: "macros/src/lib.rs · 5–72",
      sig: "#[proc_macro_derive(StoreTable)] pub fn derive_store_table(input: TokenStream) -> TokenStream",
      calls: [],
      summary: "Em tempo de compilação, gera Display e StoreTableTrait para uma struct com campos nomeados.",
      body: `<p>O crate se chama <code>store_macros</code> e é <code>proc-macro = true</code>. O atributo visível no binário é <code>StoreTable</code>, reexportado por <code>store_gram::macros</code>.</p>
      <p>Para cada campo nomeado, <code>get_filds</code> vira um <code>vec!</code> de <code>(Arc::from(stringify!(campo)), Arc::from(stringify!(tipo)))</code>. <code>get_struct</code> devolve <code>stringify!(NomeDaStruct)</code>. O <code>Display</code> escreve <code>campo: valor</code> e uma quebra de linha por campo, usando <code>?</code> no <code>write!</code>.</p>
      <p>Struct sem campo nomeado gera vetor vazio. Qualquer coisa que não seja struct dá <code>panic!</code> na macro, durante o compile. O <code>Display</code> de uma tuple struct sai vazio e tende a não compilar, porque a função <code>fmt</code> precisa devolver <code>fmt::Result</code>. User, Images e Games são structs nomeadas, então passam.</p>
      <p>Os identificadores <code>fmt</code>, <code>Arc</code> e <code>StoreTableTrait</code> não são qualificados com caminho absoluto. Eles precisam estar importados no módulo da struct. É por isso que <code>main.rs</code> importa o módulo <code>macros</code> inteiro.</p>
      ${code("expansão aproximada de User", "impl fmt::Display for User {\n    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {\n        write!(f, \"{}: {}\\n\", \"nome\", self.nome)?;\n        write!(f, \"{}: {}\\n\", \"idade\", self.idade)?;\n        Ok(())\n    }\n}\n\nimpl StoreTableTrait for User {\n    fn get_filds() -> Vec<(Arc<str>, Arc<str>)> {\n        vec![\n            (Arc::from(\"nome\"), Arc::from(\"String\")),\n            (Arc::from(\"idade\"), Arc::from(\"u8\")),\n        ]\n    }\n    fn get_struct() -> &'static str { \"User\" }\n}")}`,
    },
  ];

  const emptyTg = { channel: null, topics: [], note: "" };
  function st(partial) {
    return {
      mem: partial.mem || [],
      disk: partial.disk || [],
      channel: partial.channel || null,
      topics: partial.topics || [],
      note: partial.note || "",
    };
  }

  const userMsg = { from: "insert", text: "nome: Luiz\nidade: 10" };
  const gameMsg = { from: "insert", text: "path: ./re9\nprice: 90" };

  const flows = {
    boot: {
      title: "O que o binário faz do começo ao loop",
      steps: [
        {
          label: "Credencial",
          title: "TelegramAPP segura hash, id e telefone",
          html: `<p><code>main</code> monta a credencial e ainda não abre rede. O banco, as tabelas e a sessão não existem dentro do processo.</p>${note("danger", "Valores omitidos", "O fonte passa os três argumentos em claro. Aqui eles ficam como placeholder.")}`,
          state: st({
            mem: [["TelegramAPP", "hash, api_id, telefone"], ["Store", "ainda não existe"]],
            disk: [["session.gram", "intocado"], ["schema.base", "intocado"], ["schema.table", "intocado"]],
            note: "Nada foi enviado.",
          }),
        },
        {
          label: "Connect",
          title: "A sessão abre e o runner de rede sobe",
          html: `<p><code>Store::connect</code> abre <code>./session.gram</code>. Na primeira vez pede o código no stdin. Nas seguintes, <code>get_me</code> basta. O <code>Database</code> nasce vazio de propósito.</p>`,
          state: st({
            mem: [["client", "autorizado"], ["user", "conta logada"], ["channel", "IsNotSet"], ["tables_fields", "vazio"], ["tables_peer", "vazio"]],
            disk: [["session.gram", "aberto, auth gravada"], ["schema.base", "ainda ausente"], ["schema.table", "ainda ausente"]],
            note: "A conta está online. Nenhum canal foi escolhido.",
          }),
        },
        {
          label: "Banco",
          title: "UserDB vira um canal com fórum",
          html: `<p><code>create_db(\"UserDB\")</code> cria o canal se <code>schema.base</code> não tiver esse nome, e grava <code>id</code> mais <code>access_hash</code>. O objeto <code>Channel</code> fica na memória.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["channel", "Channel { id, access_hash }"], ["tables_fields", "vazio"], ["tables_peer", "vazio"]],
            disk: [["schema.base", "UserDB | channel_id | access_hash"], ["schema.table", "ainda ausente"], ["session.gram", "aberto"]],
            note: "O fórum existe e ainda não tem tópico.",
          }),
        },
        {
          label: "Tabelas",
          title: "Cada struct vira um tópico",
          html: `<p>Três chamadas, nesta ordem: <code>User</code>, <code>Images</code>, <code>Games</code>. Cada uma cria um tópico, guarda <code>service.id</code> e acrescenta uma linha em <code>schema.table</code>.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["tables_fields", "User, Images, Games"], ["tables_peer", "três ids de tópico"]],
            disk: [["schema.table", "3 linhas: nome | campos | topic id"], ["schema.base", "1 linha UserDB"]],
            topics: [
              { title: "User", active: false, messages: [] },
              { title: "Images", active: false, messages: [] },
              { title: "Games", active: true, messages: [] },
            ],
            note: "Tópicos criados. Nenhuma linha de dado ainda.",
          }),
        },
        {
          label: "Listar",
          title: "show_db_tables imprime os campos, não os nomes",
          html: `<p>O <code>for</code> percorre <code>values()</code>. No terminal aparecem os vetores de pares campo/tipo. A chave <code>User</code> não entra no <code>Debug</code>.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["saída", "[(nome, String), (idade, u8)] e as outras duas"]],
            disk: [["schema.table", "já gravado"], ["schema.base", "já gravado"]],
            topics: [
              { title: "User", messages: [] },
              { title: "Images", messages: [] },
              { title: "Games", messages: [] },
            ],
            note: "Só memória foi lida. O Telegram não foi consultado neste passo.",
          }),
        },
        {
          label: "REPL",
          title: "O processo passa a esperar uma linha",
          html: `<p>Daí em diante o programa não cria mais estrutura, a menos que você chame outra função. Ele lê stdin, dispara <code>insert</code> ou <code>get</code>, e dorme 5 segundos. Use o simulador na página do <code>main.rs</code> para ver as combinações.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["loop", "bloqueado em read_line"]],
            disk: [["três arquivos", "session + dois schemas"]],
            topics: [{ title: "User", active: true, messages: [] }],
            note: "Pronto para receber user, games ou get.",
          }),
        },
      ],
    },
    connect: {
      title: "Dentro de Store::connect",
      steps: [
        {
          label: "SQLite",
          title: "A sessão é um arquivo, não um login em memória",
          html: `<p><code>SqliteSession::open(\"./session.gram\")</code> cria o arquivo se precisar. O <code>.gitignore</code> ignora esse nome. A auth da conta fica aí, não no <code>TelegramAPP</code>.</p>`,
          state: st({
            mem: [["session", "Arc<SqliteSession>"]],
            disk: [["session.gram", "aberto agora"], ["schema.base", "não é desta função"], ["schema.table", "não é desta função"]],
            note: "Ainda sem socket útil: falta o runner.",
          }),
        },
        {
          label: "Runner",
          title: "SenderPool separa a rede do cliente",
          html: `<p><code>SenderPool::new(session, api_id)</code> devolve <code>runner</code>, <code>handle</code> e <code>updates</code>. O código fica com o handle, sobe <code>runner.run()</code> numa task e joga <code>updates</code> fora. <code>Client::new(handle)</code> é a fachada dos RPCs.</p>${code("store_gram.rs", "let client = Client::new(handle.clone());\ntokio::task::spawn(async move {\n    runner.run().await;\n});")}`,
          state: st({
            mem: [["runner", "task em segundo plano"], ["client", "pronto para invoke"], ["updates", "descartado"]],
            disk: [["session.gram", "compartilhado com o pool"]],
            note: "Sem o spawn, os awaits seguintes não têm transporte.",
          }),
        },
        {
          label: "Primeira vez",
          title: "Sem auth, o código chega no stdin",
          html: `<p><code>request_login_code(&app.phone, &app.api_hash)</code>. Erro vira panic com o texto <code>ERRO</code>. O código digitado passa por <code>trim</code> e entra em <code>sign_in</code>. O usuário devolvido vai para o campo <code>user</code>, que ninguém mais lê.</p>`,
          state: st({
            mem: [["user", "preenchido pelo sign_in"], ["database", "Default"]],
            disk: [["session.gram", "passa a ter a autorização"]],
            note: "O Telegram mandou o código para a conta. O processo só continua depois do Enter.",
          }),
        },
        {
          label: "Já logado",
          title: "Com sessão válida, get_me substitui o stdin",
          html: `<p>O <code>if !client.is_authorized()</code> é falso. <code>get_me</code> busca a conta e o mesmo <code>Store</code> é montado. Os dois ramos devolvem <code>Arc&lt;Mutex&lt;Store&gt;&gt;</code>.</p>`,
          state: st({
            mem: [["user", "preenchido por get_me"], ["database.channel", "IsNotSet"]],
            disk: [["session.gram", "reutilizado"]],
            note: "Conectar de novo não pede código se o arquivo de sessão ainda servir.",
          }),
        },
      ],
    },
    createdb: {
      title: "Dentro de create_db",
      steps: [
        {
          label: "Índice",
          title: "search_base decide entre reabrir e criar",
          html: `<p>O nome pedido no <code>main</code> é <code>\"UserDB\"</code>. A função não recebe um objeto de banco: o nome é a chave da linha em <code>schema.base</code>.</p>`,
          state: st({
            mem: [["argumento", "UserDB"]],
            disk: [["schema.base", "ausente na primeira vez"]],
            note: "FileNotExist cai no mesmo ramo de criar. O match só trata Ok.",
          }),
        },
        {
          label: "Criar",
          title: "CreateChannel com forum ligado",
          html: `<p>Título <code>UserDB</code>, about <code>database</code>, <code>forum: true</code>, <code>megagroup: false</code>, <code>broadcast: false</code>. Erro de invoke é impresso e devolvido como <code>Err</code>. O <code>main</code> faz <code>unwrap</code> nesse Result.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["RPC", "channels.createChannel"]],
            disk: [["schema.base", "ainda não escrito neste passo"]],
            note: "O canal acaba de nascer. O índice local ainda não aponta para ele.",
          }),
        },
        {
          label: "Persistir",
          title: "O id e o access_hash descem para o disco",
          html: `<p>Do <code>Updates</code>, cada <code>Chat::Channel</code> atualiza a memória e chama <code>insert_base</code>. A linha fica <code>UserDB|&lt;id&gt;|&lt;access_hash&gt;</code>. Se o arquivo não existir, <code>insert_base</code> cria.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["channel", "o Channel devolvido pela API"]],
            disk: [["schema.base", "UserDB | id | access_hash"]],
            note: "A partir daqui o nome UserDB resolve para esse canal.",
          }),
        },
        {
          label: "Reabrir",
          title: "Na vez seguinte, GetChannels substitui o CreateChannel",
          html: `<p>Achou a linha: monta <code>InputChannel</code>, chama <code>channels.GetChannels</code> e, se algum chat tiver o mesmo id, guarda o canal. Não regrava o arquivo. Não carrega tópicos.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["channel", "reidratado"], ["tabelas", "continuam vazias até table_exist"]],
            disk: [["schema.base", "lido, não alterado"]],
            note: "Reabrir não cria um segundo canal. Apagar schema.base faz a próxima subida criar outro.",
          }),
        },
      ],
    },
    createtable: {
      title: "Dentro de create_table",
      steps: [
        {
          label: "Já existe?",
          title: "table_exist pode carregar e recusar ao mesmo tempo",
          html: `<p>Memória vazia e arquivo com a linha de User: a função preenche os dois mapas e devolve true. <code>telegram_create_table</code> então devolve <code>TableAlreadyExist</code> sem chamar a API. É assim que a segunda execução recupera o tópico.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["tables_fields User", "(nome, String), (idade, u8)"], ["tables_peer User", "id vindo do arquivo"]],
            disk: [["schema.table", "linha já presente"]],
            topics: [{ title: "User", active: true, messages: [] }],
            note: "Nenhum tópico novo. A memória apenas alcançou o disco.",
          }),
        },
        {
          label: "Schema cedo",
          title: "Os campos entram na memória antes do RPC",
          html: `<p>No primeiro create, <code>table_exist</code> é falso. A próxima linha já faz <code>set_table_fields</code>. Se o Telegram recusar o tópico, a próxima tentativa vê a chave, devolve “já existe” e nunca grava o peer.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["tables_fields", "User já inserido"], ["tables_peer", "ainda sem User"]],
            disk: [["schema.table", "ainda sem a linha"]],
            note: "Janela em que memória e Telegram discordam.",
          }),
        },
        {
          label: "Tópico",
          title: "CreateForumTopic usa o nome da struct como título",
          html: `<p>Peer do RPC é o canal do banco. <code>random_id</code> sai de <code>rand::random::<i64>()</code>. O título de User é a string <code>User</code>, vinda de <code>get_struct</code>, não um nome que você passa à parte.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["RPC", "messages.createForumTopic"]],
            disk: [["schema.table", "ainda não"]],
            topics: [{ title: "User", active: true, messages: [] }],
            note: "O tópico nasce com uma mensagem de serviço TopicCreate.",
          }),
        },
        {
          label: "Peer",
          title: "service.id é o identificador do tópico",
          html: `<p>O código só aceita a ação <code>TopicCreate</code> quando <code>from_id</code> está presente. Aí grava <code>service.id</code> no mapa e chama <code>insert_table</code> com os campos no formato <code>nome: String,idade: u8</code>.</p>${code("schema.table", "User|nome: String,idade: u8|4821\nImages|path: String,size: u8|4822\nGames|path: String,price: u8|4823")}`,
          state: st({
            channel: "UserDB",
            mem: [["tables_peer User", "4821"]],
            disk: [["schema.table", "linha User acrescentada"]],
            topics: [{ title: "User", active: true, messages: [{ from: "serviço", text: "TopicCreate · id 4821" }] }],
            note: "O insert futuro responde a mensagem 4821 para cair dentro de User.",
          }),
        },
      ],
    },
    insert: {
      title: "Dentro de insert",
      steps: [
        {
          label: "Checagem",
          title: "Sem tabela, o insert não faz nada",
          html: `<p>Não há erro, log nem retorno. Se você apagar a memória e o <code>schema.table</code>, digitar <code>user</code> no loop não cria a tabela e não manda mensagem.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["tables_fields", "sem User"], ["efeito", "return implícito"]],
            disk: [["schema.table", "sem a linha User"]],
            note: "O stdin foi lido. O Telegram não viu esta tentativa.",
          }),
        },
        {
          label: "Texto",
          title: "Display vira o corpo da mensagem",
          html: `<p>A macro escreve cada campo em uma linha. <code>insert</code> ainda imprime o primeiro nome de campo (<code>nome</code> ou <code>path</code>) antes de enviar. Isso é stdout local, não vai para o Telegram.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["texto", "nome: Luiz\\nidade: 10\\n"], ["reply_to", "4821"]],
            disk: [["schemas", "não mudam no insert"]],
            topics: [{ title: "User", active: true, messages: [] }],
            note: "Ainda não enviou. O InputMessage já está montado.",
          }),
        },
        {
          label: "Envio",
          title: "send_message no canal, reply no tópico",
          html: `<p>O chat é o <code>Channel</code> guardado no banco. O <code>reply_to</code> é o que coloca a bolha dentro do tópico. O lock do <code>Store</code> continua seguro durante o await, porque <code>main</code> chamou <code>insert</code> com o guard aberto.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["lock", "segurado durante o envio"]],
            disk: [["schema.table", "igual"], ["schema.base", "igual"]],
            topics: [{ title: "User", active: true, messages: [userMsg] }],
            note: "A linha agora só existe como mensagem. Não há índice local dela.",
          }),
        },
        {
          label: "De novo",
          title: "Outro insert é outra mensagem",
          html: `<p>Não existe chave primária. Digitar <code>user</code> outra vez manda o mesmo Luiz de novo. <code>user games</code> numa linha só dispara os dois <code>if</code> do <code>main</code>, nas duas tabelas.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["User", "duas mensagens iguais"], ["Games", "uma mensagem"]],
            disk: [["índice", "não cresce com a linha"]],
            topics: [
              { title: "User", active: true, messages: [userMsg, userMsg] },
              { title: "Games", messages: [gameMsg] },
            ],
            note: "Append-only. Update e delete não foram escritos.",
          }),
        },
      ],
    },
    get: {
      title: "Dentro de get",
      steps: [
        {
          label: "Ids",
          title: "Só entra tópico que já está em tables_peer",
          html: `<p>Logo depois do boot, os três ids estão na memória porque <code>create_table</code> rodou. Se você chamasse <code>get</code> só com <code>connect</code> e <code>create_db</code>, o vetor sairia vazio: as tabelas ainda não foram hidratadas.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["topics", "[id User, id Images, id Games]"]],
            disk: [["schema.table", "não é relido aqui"]],
            topics: [
              { title: "User", messages: [userMsg] },
              { title: "Images", messages: [] },
              { title: "Games", messages: [gameMsg] },
            ],
            note: "As linhas desenhadas já estão no Telegram. get ainda não as pediu.",
          }),
        },
        {
          label: "RPC",
          title: "GetForumTopicsById pede o cabeçalho do tópico",
          html: `<p>O peer é <code>InputPeerChannel</code> do banco. O vetor <code>topics</code> são os ids. A API devolve a ficha do tópico e a mensagem associada à criação, não o histórico.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["RPC", "messages.getForumTopicsByID"]],
            disk: [["disco", "intocado"]],
            topics: [
              { title: "User", active: true, messages: [{ from: "cabeçalho", text: "mensagem de serviço" }] },
            ],
            note: "A bolha do Luiz não faz parte desta resposta.",
          }),
        },
        {
          label: "Print",
          title: "Título e texto são alinhados pela posição no vetor",
          html: `<p>O loop vai de <code>0</code> até <code>messages.len()</code> e lê <code>topics[idx]</code> na mesma posição. Se um vetor vier mais curto, entra em panic. Serviço vira o texto <code>Não tem</code>. O <code>unwrap</code> do título também entra em panic se a variante não for <code>ForumTopic::Topic</code>.</p>${code("stdout provável", "TOPIC: User\n ------- \nMESSAGE: Não tem")}`,
          state: st({
            channel: "UserDB",
            mem: [["stdout", "TOPIC + Não tem, por tópico"]],
            disk: [["disco", "intocado"]],
            topics: [
              { title: "User", messages: [userMsg] },
              { title: "Games", messages: [gameMsg] },
            ],
            note: "O que foi inserido continua no tópico. Esta função não o mostra.",
          }),
        },
      ],
    },
    restart: {
      title: "Segunda execução, com os arquivos ainda no disco",
      steps: [
        {
          label: "Sessão",
          title: "connect não restaura banco nem tabela",
          html: `<p>Memória nova, <code>Database::default</code>. A auth vem de <code>session.gram</code>. <code>schema.*</code> ainda não foi aberto.</p>`,
          state: st({
            mem: [["channel", "IsNotSet"], ["mapas", "vazios"]],
            disk: [["session.gram", "válida"], ["schema.base", "existe"], ["schema.table", "existe"]],
            note: "Processo recém-nascido. O Telegram ainda tem o canal antigo.",
          }),
        },
        {
          label: "Banco",
          title: "create_db acha UserDB e não cria outro canal",
          html: `<p><code>GetChannels</code> confirma o id. <code>database.channel</code> volta a existir. As tabelas seguem vazias na memória.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["channel", "reidratado"], ["tables_peer", "vazio"]],
            disk: [["schema.base", "lido"]],
            topics: [
              { title: "User", messages: [userMsg] },
              { title: "Images", messages: [] },
              { title: "Games", messages: [gameMsg] },
            ],
            note: "Os tópicos antigos continuam lá. A memória ainda não sabe os ids.",
          }),
        },
        {
          label: "Tabelas",
          title: "create_table hidrata e para",
          html: `<p>Para User, Images e Games, <code>table_exist</code> lê a linha, preenche os mapas e <code>telegram_create_table</code> devolve <code>TableAlreadyExist</code>. O <code>main</code> não trata isso como falha. Nenhum tópico duplicado é criado.</p>`,
          state: st({
            channel: "UserDB",
            mem: [["tables_peer", "três ids restaurados"], ["stdout", "TABLE JA EXISTE, três vezes"]],
            disk: [["schema.table", "lido, sem linha nova"]],
            topics: [
              { title: "User", active: true, messages: [userMsg] },
              { title: "Games", messages: [gameMsg] },
            ],
            note: "Insert de novo funciona, porque o reply_to voltou para a memória.",
          }),
        },
        {
          label: "Sem índice",
          title: "Apagar os schemas órfã o canal e duplica estrutura",
          html: `<p>Sem a linha em <code>schema.base</code>, <code>create_db</code> cria outro canal com o mesmo título. Sem a linha em <code>schema.table</code>, <code>create_table</code> cria outro tópico <code>User</code>. As mensagens velhas ficam no canal antigo, sem ponteiro.</p>`,
          state: st({
            channel: "UserDB (outro canal)",
            mem: [["channel", "id novo"]],
            disk: [["schema.base", "reescrito com o id novo"], ["schema.table", "tópicos novos"]],
            topics: [{ title: "User", active: true, messages: [] }],
            note: "O canal anterior continua na conta, fora do índice.",
          }),
        },
      ],
    },
  };

  const arch = [
    { id: "store", col: "mem", kicker: "Processo", title: "Store", sub: "dono do cliente e do catálogo", html: "<p>Um único objeto junta a sessão, o usuário, o <code>Client</code> e o <code>Database</code>. Vive atrás de um mutex. Quase toda operação do binário passa por ele.</p>" },
    { id: "client", col: "mem", kicker: "Processo", title: "Client + runner", sub: "MTProto do grammers 0.9", html: "<p>O <code>Client</code> faz <code>invoke</code> e <code>send_message</code>. A task do <code>runner</code> é o transporte. Updates recebidos são ignorados, então nada aqui reage a uma mensagem digitada no app do Telegram.</p>" },
    { id: "channel-mem", col: "mem", kicker: "Processo", title: "database.channel", sub: "IsNotSet ou o canal aberto", html: "<p>É o banco da execução atual. Sem isso, criar tabela e inserir não têm peer de destino. Reidratar é trabalho do <code>create_db</code>, não do <code>connect</code>.</p>" },
    { id: "fields", col: "mem", kicker: "Processo", title: "tables_fields", sub: "nome → [(campo, tipo)]", html: "<p>O schema em memória. A chave é o nome da struct. <code>show_db_tables</code> devolve os valores deste mapa. <code>table_exist</code> usa a presença da chave como “a tabela existe”.</p>" },
    { id: "peers", col: "mem", kicker: "Processo", title: "tables_peer", sub: "nome → id do tópico", html: "<p>O número que o <code>insert</code> coloca em <code>reply_to</code>. É o <code>service.id</code> da mensagem <code>TopicCreate</code>, guardado como <code>i32</code>. Some da memória quando o processo morre e volta pelo <code>schema.table</code>.</p>" },
    { id: "session", col: "disk", kicker: "Disco", title: "session.gram", sub: "SQLite da conta", html: "<p>Auth do usuário Telegram. Caminho fixo em <code>connect</code>. Está no <code>.gitignore</code>. Perder o arquivo força um login novo. Não contém o mapa de bancos nem de tabelas.</p>" },
    { id: "base", col: "disk", kicker: "Disco", title: "schema.base", sub: "nome | channel_id | access_hash", html: "<p>Uma linha por banco. É o único jeito de achar o canal na próxima execução. O código não varre os diálogos da conta para descobrir qual canal era o UserDB.</p>" },
    { id: "tablefile", col: "disk", kicker: "Disco", title: "schema.table", sub: "nome | campos | topic id", html: "<p>Uma linha por tabela. A coluna do meio é texto, não JSON. O espaço depois dos dois-pontos entra no tipo na hora de reler. Também está no <code>.gitignore</code>.</p>" },
    { id: "tg-channel", col: "tg", kicker: "Telegram", title: "Canal fórum", sub: "isso é o banco", html: "<p>Criado por <code>channels.createChannel</code> com <code>forum: true</code>. O título é o nome passado a <code>create_db</code>. O about gravado é a string <code>database</code>. Os dados de verdade moram aqui, na nuvem da conta.</p>" },
    { id: "tg-topic", col: "tg", kicker: "Telegram", title: "Tópico", sub: "isso é a tabela", html: "<p>Criado por <code>messages.createForumTopic</code>. O título é o nome da struct. A identidade usada pelo resto do código é o id da mensagem de serviço que criou o tópico.</p>" },
    { id: "tg-msg", col: "tg", kicker: "Telegram", title: "Mensagem", sub: "isso é a linha", html: "<p>Texto produzido pelo <code>Display</code>, enviado com <code>reply_to</code> no id do tópico. Não há arquivo, não há mídia, não há id devolvido para um índice local. Várias linhas são várias mensagens.</p>" },
    { id: "hash", col: "tg", kicker: "Telegram", title: "access_hash", sub: "a senha do peer", html: "<p>Sem o par <code>channel_id</code> + <code>access_hash</code> o cliente não monta <code>InputPeerChannel</code>. Por isso os dois vão juntos para <code>schema.base</code>. O hash pode mudar se o canal for reobtido; o código usa o valor guardado na criação ou o que <code>GetChannels</code> devolveu.</p>" },
  ];

  const tree = {
    name: "main",
    id: "fn-main",
    children: [
      { name: "TelegramAPP::new", id: "fn-app-new" },
      {
        name: "Store::connect",
        id: "fn-connect",
        children: [
          { name: "SqliteSession::open", id: "ext-sqlite" },
          { name: "SenderPool::new", id: "ext-pool" },
          { name: "Client::new", id: "ext-client" },
          { name: "runner.run", id: "ext-runner" },
          { name: "request_login_code / sign_in", id: "ext-login" },
          { name: "get_me", id: "ext-me" },
          { name: "Database::default", id: "fn-db-default" },
        ],
      },
      {
        name: "Store::create_db",
        id: "fn-create-db",
        children: [
          { name: "File::search_base", id: "fn-search-base" },
          { name: "channels.GetChannels", id: "ext-getch" },
          { name: "channels.CreateChannel", id: "ext-createch" },
          { name: "Database::set_channel", id: "fn-set-channel" },
          { name: "File::insert_base", id: "fn-insert-base", children: [{ name: "File::create", id: "fn-file-create" }] },
        ],
      },
      {
        name: "Store::create_table",
        id: "fn-create-table",
        children: [
          {
            name: "telegram_create_table",
            id: "fn-tg-create-table",
            children: [
              { name: "table_exist", id: "fn-table-exist", children: [{ name: "File::search_table", id: "fn-search-table" }, { name: "StoreTableTrait", id: "tr-store" }] },
              { name: "set_table_fields", id: "fn-set-fields" },
              { name: "messages.CreateForumTopic", id: "ext-topic" },
              { name: "File::insert_table", id: "fn-insert-table" },
            ],
          },
        ],
      },
      { name: "show_db_tables", id: "fn-show" },
      {
        name: "Store::insert",
        id: "fn-insert",
        children: [
          { name: "table_exist", id: "fn-table-exist" },
          { name: "Display da macro", id: "fn-derive" },
          { name: "Client::send_message", id: "ext-send" },
        ],
      },
      { name: "Store::get", id: "fn-get", children: [{ name: "messages.GetForumTopicsById", id: "ext-gettopics" }] },
    ],
  };

  const pages = [
    {
      id: "visao",
      kicker: "Comece por aqui",
      title: "O que este código é",
      lead: "StoreGram usa a sua conta do Telegram como um banco pequeno. Um banco é um canal com fórum, uma tabela é um tópico, uma linha é uma mensagem de texto. O índice que liga o nome local ao id do Telegram fica em dois arquivos do lado do processo.",
      sections: [
        {
          id: "frase",
          title: "Em uma frase",
          html: `<p>O binário sobe um cliente MTProto com a biblioteca <code>grammers</code> 0.9, garante um canal fórum chamado como o banco, garante um tópico por struct marcada com <code>#[derive(StoreTable)]</code>, e manda o <code>Display</code> dessa struct como mensagem dentro do tópico.</p>
          <div class="jump">
            <a href="#mapa"><span>01</span><strong>Mapa da arquitetura</strong><p>Os três lugares onde o estado mora: processo, disco e Telegram.</p></a>
            <a href="#modelo"><span>02</span><strong>Banco, tabela e linha</strong><p>A tradução que o código faz o tempo todo, e o que ele ainda não guarda.</p></a>
            <a href="#fluxo-boot"><span>03</span><strong>Fluxo do binário</strong><p>Do <code>main</code> até o loop, com o estado mudando a cada passo.</p></a>
            <a href="#retomar"><span>04</span><strong>Como retomar</strong><p>O que falta para o plano de arquivo partido, e em que ordem mexer.</p></a>
          </div>`,
        },
        {
          id: "lembranca",
          title: "O plano de arquivo e o que está escrito",
          html: `<p>A lembrança do projeto é uma lib de espaço livre no Telegram, quebrando o arquivo e mandando por vários meios. O que está no repositório hoje é a camada de baixo disso: a conta, o canal, o tópico e um índice local. O dado que viaja é texto de uma struct de demo, não bytes de arquivo.</p>
          <p>No fim de <code>store_gram.rs</code> ficaram duas linhas comentadas, <code>send_file</code> e <code>get_file</code> — a segunda com o typo <code>asynnc</code>. Não há leitura de arquivo, não há corte em pedaços, não há <code>upload.saveFilePart</code> e não há segundo transporte. O meio único é a conta de usuário, via um canal fórum.</p>
          <p>Os commits contam a mesma história. O primeiro traz a lib de “database telegram” já com canal, tópico, schema e a macro dos campos. O segundo faz a macro implementar <code>Display</code>, e o <code>insert</code> deixa de mandar o texto fixo <code>"a"</code> para mandar o valor da struct. O terceiro, <code>salvando</code>, acrescenta <code>get</code> e apaga o script solto que estava comentado no fim do arquivo.</p>
          ${note("info", "Por que a conta, e não um bot", "O login é por telefone e código, com <code>api_id</code> e <code>api_hash</code> de aplicação. Isso é sessão de usuário. É a base certa se a ideia era guardar arquivo grande na nuvem da própria conta. Essa parte de arquivo é que não chegou a ser escrita.")}`,
        },
        {
          id: "pecas",
          title: "As quatro peças",
          html: `<div class="grid-2">
            <article class="card"><span class="eyebrow">Compile</span><strong>macros</strong><p>O derive <code>StoreTable</code> descreve a struct e formata o valor.</p></article>
            <article class="card"><span class="eyebrow">Catálogo</span><strong>types.rs</strong><p>Credencial, canal aberto, mapas e o enum de status.</p></article>
            <article class="card"><span class="eyebrow">Índice</span><strong>manager.rs</strong><p>Lê e acrescenta <code>schema.base</code> e <code>schema.table</code>.</p></article>
            <article class="card"><span class="eyebrow">Rede</span><strong>store_gram.rs</strong><p>Login, canal, tópico, mensagem e a leitura dos tópicos.</p></article>
          </div>
          <p><code>main.rs</code> não é a lib. É a demonstração: cria <code>UserDB</code>, cria três tabelas e fica num REPL mínimo.</p>`,
        },
        {
          id: "crud",
          title: "O que já funciona",
          html: `<table>
            <thead><tr><th>Operação</th><th>Estado</th><th>Onde</th></tr></thead>
            <tbody>
              <tr><td>Abrir sessão e logar</td><td>feito</td><td><code>Store::connect</code></td></tr>
              <tr><td>Criar ou reabrir o banco</td><td>feito</td><td><code>create_db</code> + <code>schema.base</code></td></tr>
              <tr><td>Criar ou reabrir a tabela</td><td>feito</td><td><code>create_table</code> + <code>schema.table</code></td></tr>
              <tr><td>Inserir linha de texto</td><td>feito, só append</td><td><code>insert</code></td></tr>
              <tr><td>Ler as linhas de volta</td><td>não</td><td><code>get</code> lista o tópico, não o histórico</td></tr>
              <tr><td>Atualizar ou apagar linha</td><td>não</td><td>—</td></tr>
              <tr><td>Enviar arquivo em partes</td><td>não</td><td>comentário no fim de <code>store_gram.rs</code></td></tr>
            </tbody>
          </table>`,
        },
        {
          id: "segredo",
          title: "Antes de rodar de novo",
          html: `${note("danger", "Credencial no repositório", "main.rs constrói TelegramAPP com api_hash, api_id e telefone no fonte. Esta documentação não copia esses valores. O bloco comentado que o último commit apagou também os tinha, então o histórico do git ainda carrega. Trate isso como segredo vazado: rode fora do chat, mova para variável de ambiente e gere outra credencial da aplicação.")}
          <p>O <code>.gitignore</code> já deixa de fora <code>session.gram</code>, <code>schema.base</code> e <code>schema.table</code>. A sessão autenticada e o índice não sobem. A credencial da aplicação, sim.</p>`,
        },
      ],
    },
    {
      id: "glossario",
      kicker: "Comece por aqui",
      title: "Glossário do código",
      lead: "Várias palavras daqui não significam o que significam no Telegram ou num banco comum. Esta página é a tradução estável.",
      sections: [
        {
          id: "termos",
          title: "Palavra no fonte",
          html: `<div class="glossary">
            <article><b>base / database</b><span>O banco. No Telegram é um canal com fórum. No disco é uma linha de <code>schema.base</code>.</span></article>
            <article><b>table</b><span>A tabela. No Telegram é um tópico. No disco é uma linha de <code>schema.table</code>.</span></article>
            <article><b>peer em schema.base</b><span>O <code>channel_id</code>, um <code>i64</code>. Não é o tópico.</span></article>
            <article><b>peer em schema.table</b><span>O id da mensagem que criou o tópico. Cabe em <code>i32</code> no mapa <code>tables_peer</code>.</span></article>
            <article><b>access_hash</b><span>O outro número, obrigatório para montar <code>InputPeer</code>. Grafado <code>acess_hash</code> no parâmetro de <code>insert_base</code>.</span></article>
            <article><b>get_filds</b><span>O método da trait. A grafia sem o “e” é a que a macro gera. Não é um bug solto: é o nome da API interna.</span></article>
            <article><b>StoreTable</b><span>O derive. Implementa a trait e o <code>Display</code>.</span></article>
            <article><b>ResultErrs::Ok</b><span>Sucesso de <code>create_table</code>. Não é o <code>Ok</code> do <code>Result</code> da std.</span></article>
            <article><b>session.gram</b><span>Sessão SQLite do grammers. Auth da conta. Não é o schema.</span></article>
            <article><b>reply_to</b><span>No insert, o jeito de publicar dentro do tópico: responder a mensagem raiz dele.</span></article>
            <article><b>runner</b><span>A task de rede do <code>SenderPool</code>. Sem ela o <code>Client</code> não envia.</span></article>
          </div>`,
        },
      ],
    },
    {
      id: "mapa",
      kicker: "Comece por aqui",
      title: "Mapa da arquitetura",
      lead: "O mesmo fato vive em três sítios, e eles não se atualizam juntos. Clique um bloco para ver o papel dele.",
      sections: [
        {
          id: "tres",
          title: "Processo, disco e Telegram",
          html: `<p>A memória esquece quando o processo morre. O disco lembra os ponteiros. O Telegram lembra o conteúdo. <code>connect</code> só recupera a conta. <code>create_db</code> recupera o ponteiro do canal. <code>table_exist</code> recupera o ponteiro do tópico. Ninguém recupera a lista de mensagens.</p>
          <div data-arch></div>`,
        },
        {
          id: "porque",
          title: "Por que o índice é local",
          html: `<p>A API pede <code>channel_id</code> e <code>access_hash</code> para qualquer RPC no canal, e pede o id do tópico para publicar dentro dele. O código poderia procurar isso nos diálogos, mas não procura. Ele grava na primeira criação e lê na seguinte. É um catálogo mínimo, em texto, append-only, sem trava de arquivo.</p>
          ${note("warn", "Caminho relativo", "Os três arquivos abrem no diretório atual do processo: ./session.gram, ./schema.base e schema.table. Rodar o binário de outra pasta cria outro índice e outra sessão.")}`,
        },
      ],
    },
    {
      id: "modelo",
      kicker: "Comece por aqui",
      title: "Banco, tabela e linha",
      lead: "Esta é a correspondência que o resto do código assume. Se ela ficar na cabeça, cada função volta a fazer sentido.",
      sections: [
        {
          id: "tabela",
          title: "Correspondência",
          html: `<table>
            <thead><tr><th>No StoreGram</th><th>No Telegram</th><th>Como se acha de novo</th></tr></thead>
            <tbody>
              <tr><td>Banco <code>UserDB</code></td><td>Canal fórum com esse título</td><td><code>schema.base</code> → id + access_hash</td></tr>
              <tr><td>Tabela <code>User</code></td><td>Tópico com título User</td><td><code>schema.table</code> → id da mensagem TopicCreate</td></tr>
              <tr><td>Schema dos campos</td><td>não existe como objeto</td><td>texto <code>nome: String,idade: u8</code> na mesma linha</td></tr>
              <tr><td>Linha</td><td>mensagem de texto com reply no tópico</td><td>não se acha. Não há id salvo</td></tr>
            </tbody>
          </table>`,
        },
        {
          id: "exemplo",
          title: "Uma linha, de ponta a ponta",
          html: `<p>A struct <code>User { nome: \"Luiz\", idade: 10 }</code> não vira JSON. A macro implementa <code>Display</code>, o <code>insert</code> faz <code>format!(\"{}\", valor)</code>, e o Telegram recebe duas linhas de texto. O destino não é “o chat”. É o canal do banco, com <code>reply_to</code> igual ao id do tópico User.</p>
          ${code("o que a conta recebe", "nome: Luiz\nidade: 10\n")}
          <p>Para isso já ter acontecido, três coisas precisavam estar na memória: o <code>Client</code> logado, o <code>Channel</code> de UserDB, e o peer do tópico User. As duas últimas não sobrevivem ao fim do processo. A segunda execução reconstrói as duas a partir dos schemas, se os arquivos ainda estiverem lá.</p>`,
        },
        {
          id: "nao",
          title: "O que este modelo não tem",
          html: `<ul>
            <li>Tipo de coluna de verdade. O tipo é a string que <code>stringify!</code> viu no compile, por exemplo <code>String</code> ou <code>u8</code>. Ninguém valida o valor contra isso na hora do insert.</li>
            <li>Chave, índice, update, delete, transação.</li>
            <li>Mais de um banco ao mesmo tempo. <code>Database</code> guarda um canal só. Criar outro nome substitui <code>database.channel</code> e deixa o anterior só no arquivo, se a linha antiga não for a que a busca encontra primeiro.</li>
            <li>Arquivo. A linha é texto. O tamanho <code>u8</code> de <code>Images.size</code> é da demo, não um plano de chunk.</li>
          </ul>`,
        },
      ],
    },
    {
      id: "fluxo-boot",
      kicker: "Fluxos",
      title: "Subida do programa",
      lead: "A ordem do main, com o que cada passo deixa para trás. Os outros fluxos abrem o miolo de cada chamada.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="boot"></div>` },
        { id: "ordem", title: "Ordem fixa no fonte", html: `<p>Credencial, connect, <code>create_db(\"UserDB\")</code>, tabela User, tabela Images, tabela Games, <code>show_db_tables</code>, loop. Não há flag, não há argumento de linha de comando e não há mais de um banco.</p>` },
      ],
    },
    {
      id: "fluxo-connect",
      kicker: "Fluxos",
      title: "Conectar e login",
      lead: "Store::connect abre a sessão, sobe a rede e só então decide se pede o código.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="connect"></div>` },
        { id: "irma", title: "A irmã que ninguém chama", html: `<p><code>connect_from_session</code> repete o mesmo roteiro com um caminho de sessão escolhido, devolve <code>Store</code> sem mutex e, no ramo do login, grava o <code>session_path</code> errado. Está com <code>allow(unused)</code>. O caminho vivo é <code>connect</code>.</p>` },
      ],
    },
    {
      id: "fluxo-db",
      kicker: "Fluxos",
      title: "Criar o banco",
      lead: "create_db ou reabre o canal anotado em schema.base, ou cria um canal fórum e anota.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="createdb"></div>` },
        { id: "flag", title: "O flag do fórum", html: `<p>A chamada atual passa <code>megagroup: false</code> junto com <code>forum: true</code>. O script que foi apagado no último commit usava <code>megagroup: true</code>, que é o formato de supergrupo com tópicos. Se ao retomar o <code>CreateChannel</code> recusar o pedido, alinhar esse flag com o experimento antigo é o teste mais curto.</p>` },
      ],
    },
    {
      id: "fluxo-table",
      kicker: "Fluxos",
      title: "Criar a tabela",
      lead: "create_table é ao mesmo tempo a migração e o carregamento. A primeira vez cria o tópico. A seguinte só hidrata a memória.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="createtable"></div>` },
        { id: "task", title: "A task que não paraleliza", html: `<p>A função pública recebe o <code>Arc</code>, spawna, trava o mutex dentro da task e dá await. O <code>main</code> espera cada tabela antes da próxima. O spawn não compra paralelismo hoje. Ele existe porque o lock precisa ser adquirido dentro de quem tem o <code>Arc</code>, sem o <code>main</code> estar segurando o guard.</p>` },
      ],
    },
    {
      id: "fluxo-insert",
      kicker: "Fluxos",
      title: "Inserir uma linha",
      lead: "insert transforma a struct em texto e publica no tópico. Não grava nada no disco.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="insert"></div>` },
      ],
    },
    {
      id: "fluxo-get",
      kicker: "Fluxos",
      title: "Ler de volta",
      lead: "get foi o último acréscimo. Ele pergunta a ficha dos tópicos. As mensagens que o insert enviou ficam de fora.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="get"></div>` },
        { id: "leitura", title: "O que uma leitura de linha precisaria", html: `<p>Histórico do canal filtrado pelo reply do tópico, ou uma busca, e um jeito de separar a mensagem de serviço do texto das linhas. O índice local não ajuda: ele não guarda id de mensagem de dados. Enquanto isso não existir, o REPL <code>get</code> não devolve Luiz.</p>` },
      ],
    },
    {
      id: "fluxo-restart",
      kicker: "Fluxos",
      title: "Segunda execução",
      lead: "O processo nasce vazio. Os arquivos é que decidem se o canal e os tópicos são reaproveitados ou duplicados.",
      sections: [
        { id: "player", title: "Passo a passo", html: `<div data-flow="restart"></div>` },
      ],
    },
    {
      id: "workspace",
      kicker: "Arquivos",
      title: "Workspace Cargo",
      lead: "Dois crates. Um binário e uma macro. Ainda não há uma biblioteca que outro projeto importe.",
      sections: [
        {
          id: "arvore",
          title: "Árvore",
          html: `${code("workspace", "Cargo.toml                 members = [macros, StoreGram]\nmacros/                    crate store_macros, proc-macro\n  src/lib.rs               derive StoreTable\nStoreGram/                 binário, sem lib.rs\n  src/main.rs              demo e REPL\n  src/types.rs             tipos e a trait\n  src/manager.rs           schema.base e schema.table\n  src/store_gram.rs        cliente, operações e pub mod macros")}
          <p>O pacote do binário se chama <code>StoreGram</code>. O módulo de rede se chama <code>store_gram</code>. O pacote da macro se chama <code>store_macros</code> e entra no binário pelo path <code>../macros</code>.</p>`,
        },
        {
          id: "deps",
          title: "Dependências e o que cada uma faz aqui",
          html: `<table>
            <thead><tr><th>Crate</th><th>Uso real no fonte</th></tr></thead>
            <tbody>
              <tr><td><code>grammers-client</code> 0.9</td><td><code>Client</code>, <code>SenderPool</code>, <code>InputMessage</code>, login</td></tr>
              <tr><td><code>grammers-session</code> 0.9</td><td><code>SqliteSession</code></td></tr>
              <tr><td><code>grammers-tl-types</code> 0.9</td><td>RPCs crus: CreateChannel, CreateForumTopic, GetChannels, GetForumTopicsById</td></tr>
              <tr><td><code>grammers-mtsender</code> 0.9</td><td>Declarada no Cargo.toml. O fonte usa <code>SenderPool</code> vindo de <code>grammers_client</code></td></tr>
              <tr><td><code>tokio</code> 1.50, <code>rt-multi-thread</code></td><td><code>main</code>, spawn, mutex, sleep de thread à parte</td></tr>
              <tr><td><code>rand</code> 0.10</td><td><code>random_id</code> do tópico</td></tr>
              <tr><td><code>syn</code>, <code>quote</code>, <code>proc-macro2</code></td><td>Só na macro</td></tr>
            </tbody>
          </table>
          <p>Os dois pacotes pedem edition 2024. O <code>if let</code> com <code>&amp;&amp;</code> dentro de <code>telegram_create_table</code> é let chain dessa edition. Há um <code>Cargo.lock</code> na raiz do workspace e outro dentro de <code>StoreGram/</code>, resto de quando o binário pôde ter sido resolvido sozinho.</p>`,
        },
        {
          id: "lib",
          title: "Ainda é um binário",
          html: `<p>Não existe <code>[lib]</code> nem <code>src/lib.rs</code>. Outro crate não consegue depender de <code>Store</code> sem levar o <code>main</code> junto. Quando for a hora de virar lib, o corte natural é: tipos, manager e store no lib, e o <code>main</code> só com as structs de demo e o loop. A macro já é um crate separado, e esse lado está pronto para ser dependência.</p>`,
        },
      ],
    },
    {
      id: "file-main",
      kicker: "Arquivos",
      title: "main.rs",
      lead: "A demonstração. Define três tabelas, sobe o banco e interpreta o teclado por substring.",
      sections: [
        {
          id: "papel",
          title: "Papel do arquivo",
          html: `<p>Declara os módulos <code>store_gram</code>, <code>types</code> e <code>manager</code>. Importa <code>Store</code>, <code>TelegramAPP</code> e o glob <code>store_gram::macros::*</code>. Esse glob é o que faz o derive compilar: ele traz <code>StoreTable</code>, a trait, <code>Arc</code> e <code>fmt</code>.</p>
          <p>As structs estão com <code>allow(unused)</code> porque o compilador não vê o uso que a macro faz dos campos, e porque <code>Images</code> realmente nunca é construída.</p>`,
        },
        {
          id: "repl",
          title: "Simulador do loop",
          html: `<div data-repl></div>`,
        },
        {
          id: "funcoes",
          title: "Referência",
          html: `<div data-fns="main" data-open="1"></div>`,
        },
      ],
    },
    {
      id: "file-types",
      kicker: "Arquivos",
      title: "types.rs",
      lead: "Os tipos que o resto do programa compartilha. Não fala com a rede e não abre arquivo.",
      sections: [
        {
          id: "papel",
          title: "Papel do arquivo",
          html: `<p>Define a credencial, o catálogo em memória, a trait que a macro implementa e o enum de status de <code>create_table</code>. Dois aliases privados organizam os mapas: <code>TableFields</code> é <code>HashMap&lt;Arc&lt;str&gt;, Vec&lt;(Arc&lt;str&gt;, Arc&lt;str&gt;)&gt;&gt;</code> e <code>TablePeer</code> é <code>HashMap&lt;Arc&lt;str&gt;, i32&gt;</code>.</p>
          <p>Há um comentário logo acima, com um tipo antigo em que a tabela era uma tupla estática. A versão viva é o <code>HashMap</code>. O comentário é a pista de que o catálogo já foi uma lista fixa.</p>`,
        },
        {
          id: "funcoes",
          title: "Tipos e funções",
          html: `<div data-fns="types" data-open="1"></div>`,
        },
      ],
    },
    {
      id: "file-manager",
      kicker: "Arquivos",
      title: "manager.rs",
      lead: "O índice em texto. Quatro operações públicas, todas síncronas, todas no diretório atual.",
      sections: [
        {
          id: "papel",
          title: "Papel do arquivo",
          html: `<p>Não conhece Telegram. Recebe strings e devolve bool ou <code>SearchResult</code>. Quem interpreta o schema é <code>table_exist</code>. Quem interpreta o par de inteiros do canal é <code>create_db</code>.</p>
          <p>Os dois inserts são quase a mesma função, copiada. Criam o arquivo se faltar, abrem em append, escrevem três colunas separadas por <code>|</code> e dão flush. Não há rewrite, não há lock e não há checagem de nome repetido.</p>`,
        },
        {
          id: "lab",
          title: "Como a linha da tabela volta para a memória",
          html: `<div data-schema-lab></div>
          <p>O parser deste bloco segue o mesmo corte do Rust: <code>split('|')</code>, depois <code>split(',')</code>, depois o primeiro <code>:</code>. O que está entre aspas na tabela é o texto exato do tipo, espaço incluído.</p>`,
        },
        {
          id: "funcoes",
          title: "Referência",
          html: `<div data-fns="manager" data-open="1"></div>`,
        },
      ],
    },
    {
      id: "file-store",
      kicker: "Arquivos",
      title: "store_gram.rs",
      lead: "O miolo. Login, banco, tabela, insert e get. No fim, o módulo que reexporta a macro.",
      sections: [
        {
          id: "papel",
          title: "Papel do arquivo",
          html: `<p>Importa o cliente, a sessão, os enums crus da API e o <code>File</code> do manager. O alias <code>Result&lt;T&gt;</code> daqui é <code>Result&lt;T, Box&lt;dyn Error&gt;&gt;</code> e só o connect usa. <code>create_db</code> devolve o erro do grammers direto. <code>create_table</code> devolve <code>Option&lt;ResultErrs&gt;</code>. <code>insert</code> e <code>get</code> não devolvem erro: imprimem, ignoram ou dão unwrap.</p>
          <p>O módulo <code>macros</code>, lá na última linha, é público dentro de <code>store_gram</code>. Ele reexporta <code>fmt</code>, <code>Arc</code>, <code>StoreTableTrait</code> e o derive <code>StoreTable</code>. É um módulo de conveniência para o <code>main</code>, não lógica de rede.</p>`,
        },
        {
          id: "funcoes",
          title: "Referência",
          html: `<div data-fns="store" data-open="1"></div>`,
        },
      ],
    },
    {
      id: "file-macros",
      kicker: "Arquivos",
      title: "A macro StoreTable",
      lead: "Roda no compilador. A struct não escreve schema à mão: o derive lê os campos e gera o texto e a trait.",
      sections: [
        {
          id: "papel",
          title: "Papel do arquivo",
          html: `<p><code>macros/src/lib.rs</code> é curto de propósito. Ele só aceita o token stream da struct, separa campos nomeados, e devolve dois <code>impl</code>. Não sabe o que é Telegram. O vínculo com o banco aparece depois, quando <code>create_table</code> chama <code>get_struct</code> e <code>get_filds</code>, e quando <code>insert</code> usa o <code>Display</code>.</p>
          ${note("tip", "Onde a macro precisa estar no escopo", "O código gerado cita fmt, Arc e StoreTableTrait sem caminho. O módulo que declara a struct tem que importar os três. main faz isso com use store_gram::macros::*. Uma struct nova em outro arquivo precisa do mesmo import, ou o compile quebra dentro do código gerado, não na linha do derive.")}`,
        },
        {
          id: "funcoes",
          title: "Referência",
          html: `<div data-fns="macros" data-open="1"></div>`,
        },
      ],
    },
    {
      id: "funcoes",
      kicker: "Referência",
      title: "Todas as funções",
      lead: "O catálogo único. Filtre pelo nome ou pelo tipo. Cada cartão diz quem chama, o que chama e o efeito.",
      sections: [
        { id: "lista", title: "Catálogo", html: `<div data-fns="all"></div>` },
      ],
    },
    {
      id: "chamadas",
      kicker: "Referência",
      title: "Quem chama quem",
      lead: "A árvore a partir do main. Clique um nó da casa para abrir o resumo; o cartão completo está na página do arquivo.",
      sections: [
        {
          id: "arvore",
          title: "Árvore de chamadas",
          html: `<div data-tree></div>
          <p>Nós sem cartão são funções do grammers ou da std. Elas estão descritas no fluxo que as usa. A árvore não repete <code>connect_from_session</code> nem <code>Database::new</code>, porque nenhum caminho vivo chega nelas.</p>`,
        },
      ],
    },
    {
      id: "disco",
      kicker: "Referência",
      title: "Arquivos em disco",
      lead: "Três arquivos, todos relativos ao diretório atual, dois deles de índice e um de sessão.",
      sections: [
        {
          id: "tres",
          title: "O que cada um guarda",
          html: `<table>
            <thead><tr><th>Arquivo</th><th>Quem escreve</th><th>Quem lê</th><th>Formato</th></tr></thead>
            <tbody>
              <tr><td><code>session.gram</code></td><td>grammers, durante o login</td><td><code>SqliteSession::open</code></td><td>SQLite interno da lib</td></tr>
              <tr><td><code>schema.base</code></td><td><code>insert_base</code></td><td><code>search_base</code></td><td><code>nome|channel_id|access_hash</code></td></tr>
              <tr><td><code>schema.table</code></td><td><code>insert_table</code></td><td><code>search_table</code></td><td><code>nome|campo: tipo,...|topic_id</code></td></tr>
            </tbody>
          </table>
          <p>Os três estão no <code>.gitignore</code>. Apagar a sessão pede login de novo. Apagar os schemas faz o programa criar canal e tópicos novos e perder o ponteiro para as mensagens antigas.</p>`,
        },
        {
          id: "lab",
          title: "Laboratório da linha de tabela",
          html: `<div data-schema-lab></div>`,
        },
      ],
    },
    {
      id: "erros",
      kicker: "Referência",
      title: "Pontas soltas",
      lead: "Comportamentos que mudam o que o programa faz de verdade, separados do que ele parece fazer pelo nome da função.",
      sections: [
        {
          id: "leitura",
          title: "Leitura e listagem",
          html: `<ul>
            <li><code>get</code> não lê linhas. Lê a ficha do tópico e, no caso comum, imprime <code>Não tem</code>.</li>
            <li><code>show_db_tables</code> itera os valores do mapa de campos. O nome da tabela não aparece.</li>
            <li><code>insert</code> sem tabela conhecida volta em silêncio.</li>
            <li>O <code>expect</code> do <code>main</code> em <code>create_table</code> só vê <code>None</code>. <code>TableAlreadyExist</code> e os outros status seguem o programa.</li>
          </ul>`,
        },
        {
          id: "estado",
          title: "Memória na frente do Telegram",
          html: `<ul>
            <li><code>set_table_fields</code> roda antes de <code>CreateForumTopic</code>. Uma falha de RPC deixa a tabela “existindo” sem peer. O próximo create não tenta de novo, e o insert estoura no <code>unwrap</code> do peer.</li>
            <li><code>table_exist</code> olha só <code>tables_fields</code>. Peer ausente ainda conta como tabela existente.</li>
            <li>Os inserts de arquivo não deduplicam. Duas gravações do mesmo nome deixam a busca presa na primeira linha.</li>
            <li>Linha com menos de três colunas, ou inteiro inválido, entra em panic no <code>[]</code> ou no <code>parse</code>.</li>
            <li>Erro ao ler uma linha de <code>schema.table</code> devolve <code>FileEmpty</code> e para o arquivo inteiro.</li>
            <li>O tipo relido fica com espaço à esquerda, por causa do <code>format!(\"{}: {}\", nome, tipo)</code>.</li>
          </ul>`,
        },
        {
          id: "rede",
          title: "Rede, flag e runtime",
          html: `<ul>
            <li><code>CreateChannel</code> usa <code>megagroup: false</code> com <code>forum: true</code>. O experimento apagado usava <code>megagroup: true</code>.</li>
            <li><code>get</code> alinha <code>messages[i]</code> com <code>topics[i]</code> e dá unwrap em título e em access_hash.</li>
            <li>O ramo <code>\"Não tem\".to_string()</code> empresta um temporário. Confirme com <code>cargo check</code>.</li>
            <li><code>std::thread::sleep</code> de 5 segundos roda dentro do <code>#[tokio::main]</code> e bloqueia a thread.</li>
            <li><code>connect_from_session</code> grava <code>session_path</code> fixo no ramo do login, e ninguém chama a função.</li>
            <li>Updates são descartados. Mensagem recebida no app não acorda o processo.</li>
            <li>Credencial da aplicação está no fonte e no histórico. Não está coberta pelo gitignore.</li>
          </ul>`,
        },
      ],
    },
    {
      id: "retomar",
      kicker: "Referência",
      title: "Como retomar",
      lead: "A base que já existe é a conta, o canal e o tópico. O plano de arquivo encaixa em cima do insert, não no lugar dele.",
      sections: [
        {
          id: "ordem",
          title: "Ordem que aproveita o que está pronto",
          html: `<ol>
            <li>Tirar hash, id e telefone do <code>main</code> e tratar a credencial antiga como vazada.</li>
            <li>Rodar <code>cargo check</code> e decidir o braço de <code>get</code> que empresta o temporário, e o flag <code>megagroup</code> de <code>create_db</code>.</li>
            <li>Separar <code>src/lib.rs</code> do binário, se a meta continua sendo uma lib. A macro já está isolada.</li>
            <li>Fazer <code>get</code> ler histórico do tópico, senão não há como testar uma linha que você acabou de gravar.</li>
            <li>Só então desenhar arquivo. O gancho já está nomeado no comentário <code>send_file</code> / <code>get_file</code>.</li>
          </ol>`,
        },
        {
          id: "arquivo",
          title: "Onde o arquivo entraria",
          html: `<p>O insert de hoje é o modelo: um valor vira uma mensagem no tópico, endereçada por <code>reply_to</code>. Um arquivo grande não cabe nesse texto. O encaixe que respeita o desenho atual é uma operação irmã do <code>insert</code>, no mesmo canal e no mesmo tópico, mandando documento em vez de texto.</p>
          <p>O índice de hoje não serve para os pedaços. <code>schema.base</code> e <code>schema.table</code> guardam canal e tópico, não id de mensagem de dados. Um manifesto — uma mensagem, ou uma linha local, com a lista ordenada dos ids das partes — é a peça que não existe. Sem ela, <code>get_file</code> não tem o que remontar, do mesmo jeito que <code>get</code> hoje não acha a linha.</p>
          <p>“Vários meios” também não está no código. Há um transporte só: a sessão de usuário e um canal. Saved Messages, outro canal, ou um bot seriam outros peers, e o <code>Database</code> atual só guarda um <code>Channel</code>. O primeiro meio já tem endereço. Os outros pediriam uma lista de peers, não um campo único.</p>
          ${note("tip", "O que não precisa ser refeito", "Login, SenderPool, o par id/access_hash, o tópico como pasta e o reply_to como endereçamento. Isso já é a prateleira. O arquivo é o que vai em cima dela.")}`,
        },
        {
          id: "cuidado",
          title: "Dois cuidados que o código atual já mostra",
          html: `<ul>
            <li>O mutex segura cliente e catálogo juntos, e o <code>insert</code> não solta durante o envio. Vários pedaços em sequência travam qualquer outra operação no mesmo <code>Store</code>.</li>
            <li><code>Images.size</code> é <code>u8</code>. As structs do <code>main</code> são demo do texto. O tamanho de um pedaço de arquivo não cabe nesse campo e não precisa passar pela trait, a menos que você queira um catálogo de arquivos como tabela.</li>
          </ul>`,
        },
      ],
    },
  ];

  const nav = [
    {
      label: "Comece por aqui",
      items: [
        { id: "visao", title: "O que este código é" },
        { id: "glossario", title: "Glossário" },
        { id: "mapa", title: "Mapa da arquitetura" },
        { id: "modelo", title: "Banco, tabela e linha" },
      ],
    },
    {
      label: "Fluxos",
      items: [
        { id: "fluxo-boot", title: "Subida do programa" },
        { id: "fluxo-connect", title: "Conectar e login" },
        { id: "fluxo-db", title: "Criar o banco" },
        { id: "fluxo-table", title: "Criar a tabela" },
        { id: "fluxo-insert", title: "Inserir uma linha" },
        { id: "fluxo-get", title: "Ler de volta" },
        { id: "fluxo-restart", title: "Segunda execução" },
      ],
    },
    {
      label: "Arquivos",
      items: [
        { id: "workspace", title: "Workspace Cargo" },
        { id: "file-main", title: "main.rs" },
        { id: "file-types", title: "types.rs" },
        { id: "file-manager", title: "manager.rs" },
        { id: "file-store", title: "store_gram.rs" },
        { id: "file-macros", title: "A macro StoreTable" },
      ],
    },
    {
      label: "Referência",
      items: [
        { id: "funcoes", title: "Todas as funções" },
        { id: "chamadas", title: "Quem chama quem" },
        { id: "disco", title: "Arquivos em disco" },
        { id: "erros", title: "Pontas soltas" },
        { id: "retomar", title: "Como retomar" },
      ],
    },
  ];

  window.DOCS = { nav, pages, functions, flows, arch, tree };
})();
