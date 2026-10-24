use grammers_client::{Client, InvocationError, client::LoginToken};
use grammers_tl_types::{
    self as tl,
    enums::{ForumTopic, InputPeer, messages::ForumTopics},
    types::InputPeerChannel,
};
use std::sync::Arc;

use crate::{
    manager::{File, SearchResult},
    store_gram::{self, Store},
};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

pub struct TelegramAPP {
    pub api_hash: String,
    pub api_id: i32,
    pub phone: String,
}

impl TelegramAPP {
    pub fn new(api_hash: &str, api_id: i32, phone: &str) -> Self {
        Self {
            api_hash: api_hash.to_string(),
            api_id,
            phone: phone.to_string(),
        }
    }
}

//type TableFields = Vec<(&'static str, Vec<(&'static str, &'static str)>)>;
type TableFields = std::collections::HashMap<Arc<str>, Vec<(Arc<str>, Arc<str>)>>;
type TablePeer = std::collections::HashMap<Arc<str>, i32>;

pub enum Login {
    Verification((LoginToken, Client)),
    Connect(Arc<tokio::sync::Mutex<store_gram::Store>>),
}

pub struct SelectFilters<T> {
    fields: Vec<String>,
    where_function: Option<fn(T) -> bool>,
}

impl<T> SelectFilters<T> {
    pub fn new() -> Self {
        Self {
            fields: vec![],
            where_function: None,
        }
    }
    pub fn select<G, S>(&mut self, fields: G) -> &mut Self
    where
        G: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        for field in fields {
            let field_str = field.as_ref();

            self.fields.push(field_str.to_string());
        }

        self
    }

    pub fn where_(&mut self, where_function: fn(T) -> bool) -> &Self {
        self.where_function = Some(where_function);
        self
    }

    pub fn run(&self) {
        println!("Terminou")
    }
}

pub enum Channel {
    Channel(tl::types::Channel),
    IsNotSet,
}

pub struct Database {
    pub channel: Channel,
    pub tables_fields: TableFields,
    pub tables_peer: TablePeer,
}

impl Database {
    #[allow(unused)]
    pub fn new(channel: Channel, tables_fields: TableFields, tables_peer: TablePeer) -> Self {
        Self {
            channel,
            tables_fields,
            tables_peer,
        }
    }

    pub fn set_channel(&mut self, channel: tl::types::Channel) {
        self.channel = Channel::Channel(channel);
    }

    pub fn get_database_name(&self) -> std::result::Result<String, ()> {
        match &self.channel {
            Channel::Channel(c) => return Ok(c.title.to_string()),
            _ => Err(()),
        }
    }

    pub fn set_table_fields(&mut self, table_fields: (Arc<str>, Vec<(Arc<str>, Arc<str>)>)) {
        let _ = &self.tables_fields.insert(table_fields.0, table_fields.1);
    }

    async fn talbe_exist_in_cloud(&self, client: &Client, table: String) -> bool {
        let (channel_id, acess_has) = match &self.channel {
            Channel::Channel(c) => (Some(c.id), c.access_hash),
            _ => (None, None),
        };

        let topics = self
            .tables_peer
            .values()
            .map(|item| *item)
            .collect::<Vec<i32>>();

        let myi = InputPeer::Channel(InputPeerChannel {
            channel_id: channel_id.unwrap(),
            access_hash: acess_has.unwrap(),
        });

        let request = tl::functions::messages::GetForumTopicsById {
            peer: myi,
            topics: topics,
        };

        if let Ok(forum_topic) = client.invoke(&request).await {
            match forum_topic {
                ForumTopics::Topics(c) => {
                    for idx in 0..c.messages.len() {
                        let topic = match &c.topics[idx] {
                            ForumTopic::Topic(to) => Some(&to.title),
                            _ => None,
                        };

                        if topic.unwrap().contains(&table) {
                            return true;
                        }
                    }
                }
            }
        };

        return false;
    }

    pub async fn table_exist<T: StoreTableTrait>(&self, client: &Client) -> bool {
        let table_to_check = T::get_struct();

        let result_in_memory = self.tables_fields.contains_key(table_to_check);

        let result_in_local_file = match File::search_table(table_to_check.to_string()) {
            SearchResult::Ok(_) => true,
            _ => false,
        };

        let result_in_cloud = self
            .talbe_exist_in_cloud(client, table_to_check.to_string())
            .await;

        if result_in_memory || result_in_local_file || result_in_cloud {
            true
        } else {
            false
        }
    }

    async fn exist_cloud(database_name: String, client: &Client) -> Result<bool> {
        let mut dialogs = client.iter_dialogs();

        while let Some(dialog) = dialogs.next().await? {
            let peer = dialog.peer();

            if peer.name().unwrap_or_default() == database_name {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub async fn exist(database_name: String, client: &Client) -> bool {
        let result_in_local_file = match File::search_base(database_name.to_string()) {
            SearchResult::Ok(_) => true,
            _ => false,
        };

        let result_in_cloud = Database::exist_cloud(database_name, client)
            .await
            .unwrap_or(false);

        if result_in_cloud || result_in_local_file {
            true
        } else {
            false
        }
    }
}

impl Default for Database {
    fn default() -> Self {
        Self {
            channel: Channel::IsNotSet,
            tables_fields: std::collections::HashMap::new(),
            tables_peer: std::collections::HashMap::new(),
        }
    }
}

pub trait StoreTableTrait {
    fn get_filds() -> Vec<(Arc<str>, Arc<str>)>;
    fn get_struct() -> &'static str;
}

pub enum ResultErrs {
    ErrInicializeDataBase,
    ClientNotLogged,
    #[allow(unused)]
    ErrInvoke(InvocationError),
    TableAlreadyExist,
    DatabaseDoNotExist,
    TablePeerNotFound,
    TableDoNotExist,
    Ok,
}
