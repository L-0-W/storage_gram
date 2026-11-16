use grammers_client::{Client, InvocationError};
use grammers_tl_types::enums::Updates;
use grammers_tl_types::enums::messages::Dialogs;

use grammers_tl_types::{self as tl};

use crate::types::{ResultErrs, StoragramErros};

type ForumTopics = Vec<grammers_tl_types::enums::ForumTopic>;


pub struct TelegramUtils {}

impl TelegramUtils {
    pub async fn get_forum(target_name: &str, client: &Client) -> std::result::Result<tl::types::Channel, ()> {
        let res = client.invoke(&tl::functions::messages::GetDialogs {
            exclude_pinned: false,
            folder_id: None,
            offset_date: 0,
            offset_id: 0,
            offset_peer: tl::enums::InputPeer::Empty,
            limit: 100,
            hash: 0,
        }).await.unwrap();        
        
        
        let (_, _, chats, _, _) = match res {
            Dialogs::Slice(d) => (d.dialogs, d.messages, d.chats, d.users, false),
            Dialogs::Dialogs(d) => (d.dialogs, d.messages, d.chats, d.users, true),
            Dialogs::NotModified(_) => unreachable!("")
        };
        
        for c in &chats {
            match c {
                tl::enums::Chat::Channel(c) => {
                    let titulo_bate = c.title.eq_ignore_ascii_case(target_name);
                    
                    if titulo_bate { return Ok(c.to_owned())  }
                }
                _ => {}
            }
        }
        
        return Err(());
    }
    pub async fn get_forums(client: &Client) -> std::result::Result<Vec<tl::types::Channel>, ()> {
        let res = client.invoke(&tl::functions::messages::GetDialogs {
            exclude_pinned: false,
            folder_id: None,
            offset_date: 0,
            offset_id: 0,
            offset_peer: tl::enums::InputPeer::Empty,
            limit: 100,
            hash: 0,
        }).await.unwrap();        
        
        
        let (_, _, chats, _, _) = match res {
            Dialogs::Slice(d) => (d.dialogs, d.messages, d.chats, d.users, false),
            Dialogs::Dialogs(d) => (d.dialogs, d.messages, d.chats, d.users, true),
            Dialogs::NotModified(_) => unreachable!("")
        };

        let mut databases: Vec<tl::types::Channel> = vec![];
        
        for c in &chats {
            match c {
                tl::enums::Chat::Channel(c) => {
                    if let Ok(full_ch) = TelegramUtils::get_full_forum(client, c.access_hash.unwrap_or_default(), c.id).await {
                        if full_ch.about.eq("database") {
                            println!("DATABASE FOUND: {}", c.title);
                            databases.push(c.to_owned());
                        }                    

                    }
                }
                _ => {}
            }
        }

        
        return Ok(databases);
    }
 
    pub async fn get_forum_topics(target_name: &str, client: &Client) -> std::result::Result<ForumTopics, ()> {
        
        let res = TelegramUtils::get_forum(target_name, client).await;
        
        if res.is_err() {
            return Err(())
        }
        
        let c = res.unwrap();
        
        let peer = tl::enums::InputPeer::Channel(tl::types::InputPeerChannel {
            channel_id: c.id,
            access_hash: c.access_hash.unwrap(),
        });
        
        let res = client.invoke(&tl::functions::messages::GetForumTopics {
            peer,
            q: None,
            offset_date: 0,
            offset_id: 0,
            offset_topic: 0,
            limit: 100,
        }).await.unwrap();
        
        let tl::enums::messages::ForumTopics::Topics(res) = res;
        
        for topic in &res.topics {
            if let tl::enums::ForumTopic::Topic(t) = topic {
                println!(
                    "id={} | título={} | fechado={} | fixado={} | top_message={}",
                    t.id, t.title, t.closed, t.pinned, t.top_message
                );
            }
        }
        
        return Ok(res.topics);        
    }
    pub async fn get_full_forum(client: &Client, acess_hash: i64, channel_id: i64) -> std::result::Result<tl::types::ChannelFull, ()> {
        let input = tl::enums::InputChannel::Channel(tl::types::InputChannel {
            channel_id: channel_id,
            access_hash: acess_hash,
        });
        
        let chats_res = client.invoke(&tl::functions::channels::GetFullChannel {
            channel: input
        }).await;
        
        
        if chats_res.is_err() { println!("{:?}", chats_res.err()); return Err(()) };

        let chats = chats_res.unwrap();
        let tl::enums::messages::ChatFull::Full(chat) = chats;

        match chat.full_chat {
            tl::enums::ChatFull::ChannelFull(f) => {
                return Ok(f)
            }   
            _ => {}
        }
                        
        Err(())
    }
    
    
    pub async fn create_forum(client: &Client, forum_name: &str) -> std::result::Result<tl::types::Channel, StoragramErros> {
        if client.is_authorized().await.unwrap_or(false) {
            let request = tl::functions::channels::CreateChannel {
                broadcast: false,
                megagroup: false,
                forum: true,
                for_import: false,
                title: forum_name.to_string(),
                about: "database".to_string(),
                geo_point: None,
                address: None,
                ttl_period: None,
            };
            
            let result = client.invoke(&request).await;
            
            if result.is_err() {
                let err = result.err().unwrap();
                eprintln!("{}", err);
                return Err(StoragramErros::default(ResultErrs::ErrInvoke(err), line!().to_string(), file!().to_string()));
            }
            
            let updates = result.unwrap();
            
            match updates {
                tl::enums::Updates::Updates(u) => {
                    for chat in &u.chats {
                        match chat {
                            tl::enums::Chat::Channel(c) => {
                                return Ok(c.to_owned())
                            }
                            _ => eprintln!("ERRO AO MATCH u.chats"),
                        }
                    }
                }
                _ => print!("ERRO AO MATCH updates"),
            }
            
            return Err(StoragramErros::default(ResultErrs::ErrMatcingUpdateInDatabaseCreation, line!().to_string(), file!().to_string()))
        }
        
        return Err(StoragramErros::default(ResultErrs::ClientNotLogged, line!().to_string(), file!().to_string()));
    }
    pub async fn create_topic(channel: &tl::types::Channel, client: &Client, struct_name: &str) -> std::result::Result<(), StoragramErros> {
        let forum_input = tl::types::InputPeerChannel {
            channel_id: channel.id,
            access_hash: channel.access_hash.unwrap_or_default(),
        };
        
        let create_topic = grammers_tl_types::functions::messages::CreateForumTopic {
            title_missing: false,
            title: struct_name.to_string(),
            icon_color: None,
            icon_emoji_id: None,
            random_id: rand::random::<i64>(),
            peer: forum_input.into(),
            send_as: None,
        };
        
        let result: std::result::Result<Updates, InvocationError> =
        client.invoke(&create_topic).await;
        
        if result.is_err() {
            let err = result.err().unwrap();
            eprintln!("{}", err);
            return Err(StoragramErros::default(ResultErrs::ErrInvoke(err), line!().to_string(), file!().to_string()));
        }
        
        let enums = result.unwrap();
        
        TelegramUtils::match_topic_create(enums, || {
            println!("MATCHED - Forum Criado")  
        })
    }

    pub fn match_topic_create<F>(enums: Updates, f: F) -> std::result::Result<(), StoragramErros> where F: Fn() {
    match enums {
        tl::enums::Updates::Updates(updates) => {
            for update in updates.updates {
                match update {
                    tl::enums::Update::NewChannelMessage(new_msg) => {
                        match new_msg.message {
                            tl::enums::Message::Service(service) => {
                                match service.action {
                                    tl::enums::MessageAction::TopicCreate(_) => {
                                        if service.from_id.is_some() {
                                            f()
                                            // let _ = &self.databases
                                            // [current_database_index]
                                            // .tables_peer
                                            // .insert(
                                            //     Arc::from(struct_name),
                                            //     service.id,
                                            // );
                                            
                                            // let fields_str = fields
                                            // .iter()
                                            // .map(|item| {
                                            //     String::from(format!(
                                            //         "{}: {}",
                                            //         item.0, item.1
                                            //     ))
                                            // })
                                            // .collect::<Vec<_>>()
                                            // .join(",");
                                            
                                            // File::insert_table(
                                            //     struct_name.to_string(),
                                            //     fields_str,
                                            //     service.id.to_string(),
                                            // );
                                        } else {
                                            return Err(StoragramErros::default(ResultErrs::TablePeerNotFound, line!().to_string(), file!().to_string()));
                                        };
                                    }
                                    _ => {}
                                }
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
        }
        _ => {}
    }
    return Ok(());
}

}