from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_ollama import ChatOllama

from app.config import settings

_llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0.7,
)

_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

# in-memory store: "{user_id}:{session_id}" -> ChatMessageHistory
_session_store: dict[str, ChatMessageHistory] = {}


def _get_session_history(key: str) -> ChatMessageHistory:
    if key not in _session_store:
        _session_store[key] = ChatMessageHistory()
    return _session_store[key]


_chain_with_history = RunnableWithMessageHistory(
    _prompt | _llm,
    _get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)


def _key(user_id: str, session_id: str) -> str:
    return f"{user_id}:{session_id}"


async def generate_response(user_id: str, session_id: str, user_message: str) -> str:
    response = await _chain_with_history.ainvoke(
        {"input": user_message},
        config={"configurable": {"session_id": _key(user_id, session_id)}},
    )
    return response.content


async def stream_response(user_id: str, session_id: str, user_message: str):
    """Async generator that yields text chunks from the LLM."""
    async for chunk in _chain_with_history.astream(
        {"input": user_message},
        config={"configurable": {"session_id": _key(user_id, session_id)}},
    ):
        if chunk.content:
            yield chunk.content
