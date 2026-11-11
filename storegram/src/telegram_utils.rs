use grammers_client::Client;
use grammers_tl_types::enums::messages::Dialogs;

use grammers_tl_types::types::Channel;
use grammers_tl_types::{self as tl};

use crate::types::{Database};


type ForumTopics = Vec<grammers_tl_types::enums::ForumTopic>;


pub struct TelegramUtils {}

impl TelegramUtils {
    async fn get_forum(target_name: &str, client: &Client) -> std::result::Result<Channel, ()> {
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
    async fn get_forum_topics(target_name: &str, client: &Client) -> std::result::Result<ForumTopics, ()> {
        
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
}